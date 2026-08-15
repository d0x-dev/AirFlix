import * as RNFS from '@dr.pogodin/react-native-fs';
import {cache as imageColorsCache} from 'react-native-image-colors';
import {queryClient} from './client';
import {clearHeroCache} from './hooks/useHomePageData';
import {clearImageAccentCache} from './imageAccent';
import {clearDownloadedVideoThumbnailMemoryCache} from './downloadThumbnailCache';
import {cacheStorageService} from './storage';

const PRESERVED_CACHE_ENTRIES: Set<string> = new Set([]);

const clearFilesystemCache = async (): Promise<void> => {
  const entries = await RNFS.readDir(RNFS.CachesDirectoryPath).catch(() => []);
  await Promise.all(
    entries
      .filter(entry => !PRESERVED_CACHE_ENTRIES.has(entry.name))
      .map(entry => RNFS.unlink(entry.path).catch(() => undefined)),
  );
};

export const clearAppCache = async (): Promise<void> => {
  cacheStorageService.clearAll();
  queryClient.clear();
  imageColorsCache.clear();
  clearImageAccentCache();
  clearDownloadedVideoThumbnailMemoryCache();
  clearHeroCache();
  await clearFilesystemCache();
};
