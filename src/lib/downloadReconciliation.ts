import * as RNFS from '@dr.pogodin/react-native-fs';
import {
  downloadOutputExists,
  finalizeDownloadOutput,
  getDownloadOutputSize,
  getDownloadStagingDirectory,
  getDownloadStagingPath,
} from './downloadDestination';
import {
  createDownloadDirectoryName,
  createDownloadSeasonDirectoryName,
} from './downloadId';
import {isSafDownloadLocation} from './downloadLocation';
import {notificationService} from './services/Notification';
import useDownloadsStore, {
  type DownloadItem,
  type DownloadStatus,
} from './zustand/downloadsStore';

const STALE_RUNTIME_STATUSES: ReadonlySet<DownloadStatus> = new Set([
  'starting',
  'downloading',
  'pausing',
  'canceling',
]);

const RESUMABLE_HTTP_STATUSES: ReadonlySet<DownloadStatus> = new Set([
  'starting',
  'downloading',
  'pausing',
]);

const shouldResumeHttpDownload = (record: DownloadItem): boolean =>
  RESUMABLE_HTTP_STATUSES.has(record.status) ||
  (record.status === 'paused' && record.errorCode === 'NETWORK_INTERRUPTED');

const getOutputName = (record: DownloadItem): string =>
  record.displayFileName?.replace(/\.[^.]+$/, '') || record.title;

const getStagingPath = (record: DownloadItem): string =>
  record.stagingPath ||
  getDownloadStagingPath(
    record.id,
    getOutputName(record),
    record.videoType || 'mp4',
  );

const reconcileFinalizing = async (record: DownloadItem): Promise<void> => {
  const store = useDownloadsStore.getState();
  if (
    !record.downloadLocation ||
    !isSafDownloadLocation(record.downloadLocation)
  ) {
    store.markInterrupted(
      record.id,
      'Download destination must be selected again',
    );
    return;
  }

  const finalPath =
    record.finalDocumentUri ||
    (record.filePath.startsWith('content://') ? record.filePath : undefined);
  if (finalPath && (await downloadOutputExists(finalPath))) {
    store.markCompleted(record.id, {
      filePath: finalPath,
      finalDocumentUri: finalPath,
      totalBytes: record.totalBytes,
    });
    return;
  }

  const stagingPath = getStagingPath(record);
  if (!(await RNFS.exists(stagingPath))) {
    store.markInterrupted(record.id, 'Finalization was interrupted');
    return;
  }

  try {
    const output = await finalizeDownloadOutput({
      downloadId: record.id,
      location: record.downloadLocation,
      stagingPath,
      fileName: getOutputName(record),
      fileType: record.videoType || 'mp4',
      outputDirectoryNames: [
        createDownloadDirectoryName(record.showName || record.title),
        ...[createDownloadSeasonDirectoryName(record.seasonTitle)].filter(
          (name): name is string => Boolean(name),
        ),
      ],
    });
    store.markCompleted(record.id, {
      filePath: output.filePath,
      finalDocumentUri: output.finalDocumentUri,
      totalBytes: output.size,
    });
  } catch (error) {
    store.markError(record.id, {
      message: error instanceof Error ? error.message : String(error),
      retryable: true,
    });
  }
};

const reconcileRecord = async (record: DownloadItem): Promise<void> => {
  const store = useDownloadsStore.getState();
  await notificationService
    .cancelNotification(record.id)
    .catch(() => undefined);

  if (record.status === 'completed') {
    if (!(await downloadOutputExists(record.filePath))) {
      store.markMissing(record.id);
    }
    return;
  }

  if (record.status === 'finalizing') {
    await reconcileFinalizing(record);
    return;
  }

  if (
    record.sourceType === 'http' &&
    record.finalDocumentUri &&
    shouldResumeHttpDownload(record) &&
    (await downloadOutputExists(record.finalDocumentUri))
  ) {
    const downloadedBytes = await getDownloadOutputSize(
      record.finalDocumentUri,
    ).catch(() => record.downloadedBytes);
    store.updateDownload(record.id, {
      status: 'queued',
      downloadedBytes,
      speed: 0,
      canPause: false,
      canResume: false,
      errorCode: undefined,
      errorMessage: undefined,
      retryable: undefined,
    });
    return;
  }

  if (STALE_RUNTIME_STATUSES.has(record.status)) {
    const stagingPath = getStagingPath(record);
    const stagingExists = await RNFS.exists(stagingPath);
    store.markInterrupted(
      record.id,
      stagingExists
        ? 'Download was interrupted and can be retried'
        : 'Download stopped before completion',
    );
  }
};

export const reconcileCompletedDownloadOutputs = async (): Promise<void> => {
  const completedRecords = Object.values(
    useDownloadsStore.getState().downloads,
  ).filter(record => record.status === 'completed');

  await Promise.all(
    completedRecords.map(async record => {
      if (!(await downloadOutputExists(record.filePath))) {
        useDownloadsStore.getState().markMissing(record.id);
      }
    }),
  );
};

const cleanupOrphanStaging = async (records: DownloadItem[]): Promise<void> => {
  const root = `${RNFS.CachesDirectoryPath}/downloads`;
  if (!(await RNFS.exists(root))) {
    return;
  }
  const knownDirectories = new Set(
    records.map(record => getDownloadStagingDirectory(record.id)),
  );
  const entries = await RNFS.readDir(root);
  await Promise.all(
    entries
      .filter(entry => entry.isDirectory() && !knownDirectories.has(entry.path))
      .map(entry => RNFS.unlink(entry.path).catch(() => undefined)),
  );
};

export const reconcileDownloadState = async (): Promise<void> => {
  const records = Object.values(useDownloadsStore.getState().downloads);
  await notificationService
    .resetDownloadForegroundState()
    .catch(() => undefined);
  await Promise.all(records.map(reconcileRecord));
  await cleanupOrphanStaging(records);
  const {scheduleQueuedDownloads} =
    require('./downloadManager') as typeof import('./downloadManager');
  await scheduleQueuedDownloads();
};
