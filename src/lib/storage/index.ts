// Export StorageService
export {
  StorageService,
  mainStorage,
  cacheStorage,
  clearAllMMKVStorage,
  createZustandStorage,
} from './StorageService';

// Export SettingsStorage
export {SettingsStorage, settingsStorage} from './SettingsStorage';
export type {SettingsKeys} from './SettingsStorage';

// Export WatchListStorage
export {WatchListStorage, watchListStorage} from './WatchListStorage';
export type {WatchListKeys, WatchListItem} from './WatchListStorage';

// Export CacheStorage
export {CacheStorage, cacheStorageService} from './CacheStorage';

// Export ProvidersStorage
export {ProvidersStorage, providersStorage} from './ProvidersStorage';
export type {ProvidersKeys} from './ProvidersStorage';

// Export DownloadsStorage
export {DownloadsStorage, downloadsStorage} from './DownloadsStorage';
export type {DownloadsKeys, DownloadPayload} from './DownloadsStorage';

// Export ExtensionStorage
export {ExtensionStorage, extensionStorage} from './extensionStorage';
export type {
  ExtensionKeys,
  ProviderExtension,
  ProviderModule,
} from './extensionStorage';
