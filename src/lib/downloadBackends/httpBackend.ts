import {DownloadTask, File} from 'expo-file-system';
import {
  cleanupDownloadStaging,
  deleteDownloadOutput,
} from '../downloadDestination';
import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';
import useDownloadsStore from '../zustand/downloadsStore';
import {
  DownloadPauseSupportError,
  type DownloadBackend,
  type DownloadBackendContext,
} from './types';
import {
  createDownloadDirectoryName,
  createDownloadSeasonDirectoryName,
} from '../downloadId';
import type {DownloadItem} from '../zustand/downloadsStore';

interface ActiveHttpDownload {
  task: DownloadTask;
  cancelled: boolean;
  resume: (() => void) | null;
  hasPaused: boolean;
}

const activeDownloads = new Map<string, ActiveHttpDownload>();
const activeNativeDownloads = new Set<string>();

interface NativeHttpDownloadModule {
  start(
    downloadId: string,
    url: string,
    destinationUri: string,
    headers: Record<string, string>,
  ): Promise<{
    downloadedBytes: number;
    totalBytes: number;
    destinationUri: string;
  }>;
  pause(downloadId: string): Promise<void>;
  resume(downloadId: string): Promise<void>;
  cancel(downloadId: string, deleteDestination: boolean): Promise<void>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

interface NativeProgressEvent {
  downloadId: string;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
}

interface NativeStateEvent {
  downloadId: string;
  state: 'connecting' | 'waitingForNetwork' | 'paused' | 'completed';
  message?: string;
}

const nativeHttpModule = NativeModules.HttpDownloadModule as
  | NativeHttpDownloadModule
  | undefined;
const hasNativeHttpDownloader =
  Platform.OS === 'android' && typeof nativeHttpModule?.start === 'function';

const PROGRESS_UPDATE_INTERVAL_MS = 500;

interface DownloadProgressSample {
  bytesWritten: number;
  totalBytes: number;
}

export const createDownloadProgressReporter = (
  report: (downloaded: number, total: number, speed: number) => void,
  now: () => number = Date.now,
) => {
  let previousBytes = 0;
  let previousTime = now();
  let smoothedSpeed = 0;

  return (progress: DownloadProgressSample): void => {
    const currentTime = now();
    const elapsedMilliseconds = currentTime - previousTime;
    const isComplete =
      progress.totalBytes > 0 && progress.bytesWritten >= progress.totalBytes;

    // Expo emits native progress about every 100 ms. Updating Zustand here on
    // every event also serializes the complete persisted download state each
    // time, so publish a less frequent, accurately timed sample instead.
    if (elapsedMilliseconds < PROGRESS_UPDATE_INTERVAL_MS && !isComplete) {
      return;
    }

    if (elapsedMilliseconds <= 0) {
      return;
    }

    const bytesSincePreviousSample = Math.max(
      progress.bytesWritten - previousBytes,
      0,
    );
    const instantaneousSpeed =
      (bytesSincePreviousSample * 1000) / elapsedMilliseconds;
    smoothedSpeed =
      smoothedSpeed > 0
        ? smoothedSpeed * 0.35 + instantaneousSpeed * 0.65
        : instantaneousSpeed;
    previousBytes = progress.bytesWritten;
    previousTime = currentTime;

    report(
      progress.bytesWritten,
      Math.max(progress.totalBytes, 0),
      smoothedSpeed,
    );
  };
};

const toFileUri = (path: string): string =>
  path.startsWith('file://') ? path : `file://${path}`;

const startNativeDownload = async ({
  record,
  destination,
}: DownloadBackendContext): Promise<void> => {
  if (!nativeHttpModule || !destination.directFinalDocumentUri) {
    throw new Error('Native SAF downloader destination is unavailable');
  }

  const subscriptions: EmitterSubscription[] = [];
  const emitter = new NativeEventEmitter(nativeHttpModule);
  subscriptions.push(
    emitter.addListener(
      'AirflixHttpDownloadProgress',
      (event: NativeProgressEvent) => {
        if (event.downloadId !== record.id) {
          return;
        }
        useDownloadsStore
          .getState()
          .updateProgress(
            record.id,
            event.downloadedBytes,
            event.totalBytes,
            event.speed,
          );
      },
    ),
    emitter.addListener('AirflixHttpDownloadState', (event: NativeStateEvent) => {
      if (event.downloadId !== record.id) {
        return;
      }
      if (event.state === 'waitingForNetwork') {
        useDownloadsStore.getState().updateDownload(record.id, {
          status: 'paused',
          speed: 0,
          canPause: false,
          canResume: true,
          errorCode: 'NETWORK_INTERRUPTED',
          errorMessage: 'Waiting for network connection',
        });
      } else if (event.state === 'connecting') {
        useDownloadsStore.getState().updateDownload(record.id, {
          status: 'starting',
          speed: 0,
          canPause: true,
          canResume: false,
          errorCode: undefined,
          errorMessage: undefined,
        });
      }
    }),
  );

  activeNativeDownloads.add(record.id);
  useDownloadsStore.getState().updateDownload(record.id, {
    backendJobId: record.id,
    status: 'starting',
    canPause: true,
    canResume: false,
  });

  try {
    const result = await nativeHttpModule.start(
      record.id,
      record.url,
      destination.directFinalDocumentUri,
      record.headers || {},
    );
    useDownloadsStore
      .getState()
      .updateProgress(record.id, result.downloadedBytes, result.totalBytes, 0);
  } finally {
    activeNativeDownloads.delete(record.id);
    subscriptions.forEach(subscription => subscription.remove());
  }
};

export const httpDownloadBackend: DownloadBackend = {
  directToSaf: hasNativeHttpDownloader,
  preservePartialOnFailure: hasNativeHttpDownloader,
  async start({record, destination}: DownloadBackendContext): Promise<void> {
    if (hasNativeHttpDownloader) {
      await startNativeDownload({record, destination});
      return;
    }

    const reportProgress = createDownloadProgressReporter(
      (downloaded, total, speed) =>
        useDownloadsStore
          .getState()
          .updateProgress(record.id, downloaded, total, speed),
    );
    const task = File.createDownloadTask(
      record.url,
      new File(toFileUri(destination.stagingPath)),
      {
        headers: record.headers || {},
        onProgress: progress => {
          const active = activeDownloads.get(record.id);
          if (!active || active.cancelled || active.task !== task) {
            return;
          }
          reportProgress(progress);
        },
      },
    );
    const active: ActiveHttpDownload = {
      task,
      cancelled: false,
      resume: null,
      hasPaused: false,
    };
    activeDownloads.set(record.id, active);
    useDownloadsStore.getState().updateDownload(record.id, {
      backendJobId: record.id,
      status: 'downloading',
      canPause: true,
      canResume: false,
    });

    try {
      let result = await task.downloadAsync();
      while (result === null && !active.cancelled) {
        active.hasPaused = true;
        await new Promise<void>(resolve => {
          active.resume = resolve;
        });
        active.resume = null;
        if (active.cancelled) {
          throw new Error('Download cancelled');
        }
        try {
          result = await task.resumeAsync();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          throw new DownloadPauseSupportError(
            `Unable to resume this download. The server may not support byte ranges. ${message}`,
          );
        }
      }
    } finally {
      activeDownloads.delete(record.id);
      task.release();
    }
  },

  async pause(downloadId: string): Promise<void> {
    if (activeNativeDownloads.has(downloadId) && nativeHttpModule) {
      await nativeHttpModule.pause(downloadId);
      return;
    }
    const active = activeDownloads.get(downloadId);
    if (!active || active.task.state !== 'active') {
      throw new DownloadPauseSupportError('Download is not currently active');
    }
    try {
      await active.task.pauseAsync();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new DownloadPauseSupportError(
        `Unable to pause this download. ${message}`,
      );
    }
  },

  async resume(downloadId: string): Promise<void> {
    if (activeNativeDownloads.has(downloadId) && nativeHttpModule) {
      await nativeHttpModule.resume(downloadId);
      return;
    }
    const active = activeDownloads.get(downloadId);
    if (!active || !active.hasPaused || !active.resume) {
      throw new DownloadPauseSupportError('Paused download cannot be resumed');
    }
    active.resume();
  },

  async cancel(downloadId: string): Promise<void> {
    if (activeNativeDownloads.has(downloadId) && nativeHttpModule) {
      await nativeHttpModule.cancel(downloadId, true);
      activeNativeDownloads.delete(downloadId);
      return;
    }
    const active = activeDownloads.get(downloadId);
    if (active) {
      active.cancelled = true;
      active.task.cancel();
      active.resume?.();
      activeDownloads.delete(downloadId);
    }
  },

  async cleanup(
    downloadId: string,
    suppliedRecord?: DownloadItem,
  ): Promise<void> {
    activeDownloads.delete(downloadId);
    activeNativeDownloads.delete(downloadId);
    const record =
      suppliedRecord || useDownloadsStore.getState().getDownload(downloadId);
    const directUri = record?.finalDocumentUri;
    if (
      record &&
      hasNativeHttpDownloader &&
      directUri?.startsWith('content://')
    ) {
      await deleteDownloadOutput(directUri, {
        downloadLocation: record.downloadLocation,
        outputDirectoryNames: [
          createDownloadDirectoryName(record.showName || record.title),
          ...[createDownloadSeasonDirectoryName(record.seasonTitle)].filter(
            (name): name is string => Boolean(name),
          ),
        ],
      }).catch(() => undefined);
    }
    await cleanupDownloadStaging(downloadId);
  },
};
