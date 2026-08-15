import {cacheStorage, mainStorage} from './StorageService';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Storage keys for downloads
 */
export enum DownloadsKeys {
  FILES = 'downloadFiles',
  THUMBNAILS = 'downloadThumbnails',
  DOWNLOADED_FILES = 'downloadedFiles',
  CACHE_LOCATION = 'downloadCacheLocation',
}

export interface DownloadPayload {
  id?: number;
  url?: string;
  fileName: string;
  provider: string;
  progress?: number;
  folderName: string;
  fileType: string;
  status: 'downloading' | 'paused' | 'downloaded';
}

/**
 * Downloads storage manager
 */

export class DownloadsStorage {
  /**
   * Get all downloaded files
   */
  getDownloads(): Map<string, DownloadPayload> {
    const downloadsString = mainStorage.getString(
      DownloadsKeys.DOWNLOADED_FILES,
    );
    if (!downloadsString) {
      return new Map<string, DownloadPayload>();
    }
    try {
      const downloads: Record<string, DownloadPayload> =
        JSON.parse(downloadsString);
      return new Map(Object.entries(downloads));
    } catch (error) {
      console.error('Failed to parse downloads:', error);
      return new Map<string, DownloadPayload>();
    }
  }

  /**
   * Save downloaded files information
   */
  saveDownloads(downloads: Map<string, DownloadPayload>): void {
    mainStorage.setString(
      DownloadsKeys.DOWNLOADED_FILES,
      JSON.stringify(Object.fromEntries(downloads)),
    );
  }

  takeLegacyDownloads(): Map<string, DownloadPayload> {
    const downloads = this.getDownloads();
    if (downloads.size > 0) {
      mainStorage.delete(DownloadsKeys.DOWNLOADED_FILES);
    }
    return downloads;
  }

  /**
   * Save download files information
   */
  saveFilesInfo(files: FileSystem.FileInfo[], locationKey?: string): void {
    cacheStorage.setObject(DownloadsKeys.FILES, files);
    if (locationKey) {
      cacheStorage.setString(DownloadsKeys.CACHE_LOCATION, locationKey);
    }
  }

  /**
   * Get download files information
   */
  getFilesInfo(): FileSystem.FileInfo[] | null {
    return (
      cacheStorage.getObject<FileSystem.FileInfo[]>(DownloadsKeys.FILES) || null
    );
  }

  getCacheLocation(): string | null {
    return cacheStorage.getString(DownloadsKeys.CACHE_LOCATION) || null;
  }

  /**
   * Save download thumbnails
   */
  saveThumbnails(
    thumbnails: Record<string, string>,
    locationKey?: string,
  ): void {
    cacheStorage.setObject(DownloadsKeys.THUMBNAILS, thumbnails);
    if (locationKey) {
      cacheStorage.setString(DownloadsKeys.CACHE_LOCATION, locationKey);
    }
  }

  /**
   * Get download thumbnails
   */
  getThumbnails(): Record<string, string> | null {
    return (
      cacheStorage.getObject<Record<string, string>>(
        DownloadsKeys.THUMBNAILS,
      ) || null
    );
  }

  /**
   * Clear downloads cache
   */
  clearCache(): void {
    cacheStorage.delete(DownloadsKeys.FILES);
    cacheStorage.delete(DownloadsKeys.THUMBNAILS);
    cacheStorage.delete(DownloadsKeys.CACHE_LOCATION);
  }
}

// Export a singleton instance
export const downloadsStorage = new DownloadsStorage();
