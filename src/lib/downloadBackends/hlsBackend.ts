import {cleanupDownloadStaging} from '../downloadDestination';
import {cancelHlsDownload, hlsDownloader2} from '../hlsDownloader2';
import useDownloadsStore from '../zustand/downloadsStore';
import type {DownloadBackend, DownloadBackendContext} from './types';

export const hlsDownloadBackend: DownloadBackend = {
  async start({record, destination}: DownloadBackendContext): Promise<void> {
    await hlsDownloader2({
      downloadId: record.id,
      videoUrl: record.url,
      path: destination.stagingPath,
      title: record.title,
      tempDirectory: `${destination.stagingDirectory}/segments`,
      headers: record.headers,
      onJobStarted: backendJobId =>
        useDownloadsStore.getState().updateDownload(record.id, {
          backendJobId,
          status: 'downloading',
        }),
      onProgress: (completedSegments, totalSegments) =>
        useDownloadsStore
          .getState()
          .updateProgress(record.id, completedSegments, totalSegments, 0),
      onCompleted: () => undefined,
    });
  },

  async cancel(downloadId: string): Promise<void> {
    cancelHlsDownload(downloadId);
  },

  async cleanup(downloadId: string): Promise<void> {
    await cleanupDownloadStaging(downloadId);
  },
};
