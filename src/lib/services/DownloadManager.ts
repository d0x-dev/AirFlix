import {createDirectDownloadId, createSeriesDownloadId} from '../downloadId';
import useDownloadsStore, {
  DownloadInput,
  DownloadItem,
  DownloadStatus,
} from '../zustand/downloadsStore';

export class DownloadManager {
  private static instance: DownloadManager;

  public static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }
    return DownloadManager.instance;
  }

  updateDownloadStatus(id: string, status: DownloadStatus): void {
    useDownloadsStore.getState().updateDownload(id, {status});
  }

  updateDownload(id: string, payload: Partial<DownloadItem>): void {
    useDownloadsStore.getState().updateDownload(id, payload);
  }

  addDownload(id: string, payload: Omit<DownloadInput, 'id'>): void {
    useDownloadsStore.getState().enqueueDownload({...payload, id});
  }

  async removeDownloadAsync(id: string): Promise<void> {
    useDownloadsStore.getState().removeDownload(id);
  }

  removeDownload(id: string): void {
    useDownloadsStore.getState().removeDownload(id);
  }

  getDownload(id: string): DownloadItem | undefined {
    return useDownloadsStore.getState().getDownload(id);
  }

  isDownloaded(id: string): boolean {
    return this.getDownload(id)?.status === 'completed';
  }

  getAllDownloads(): Record<string, DownloadItem> {
    return useDownloadsStore.getState().downloads;
  }

  generateDownloadId({
    baseTitle,
    seasonTitle,
    index,
    exactId,
  }: {
    baseTitle: string;
    seasonTitle?: string;
    index: number;
    exactId?: string;
  }): string {
    if (exactId) {
      return exactId;
    }
    return seasonTitle
      ? createSeriesDownloadId(baseTitle, seasonTitle, index)
      : createDirectDownloadId(baseTitle, 'Default', index);
  }
}

export const downloadManager = DownloadManager.getInstance();
