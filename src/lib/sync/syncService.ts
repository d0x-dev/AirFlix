import * as Crypto from 'expo-crypto';
import {settingsStorage} from '../storage';
import {
  WatchListKeys,
  watchListStorage,
  type WatchListItem,
} from '../storage/WatchListStorage';
import {cacheStorage, mainStorage} from '../storage/StorageService';
import useDownloadsStore, {type DownloadItem} from '../zustand/downloadsStore';
import useContinueWatchingStore, {
  type ContinueWatchingItem,
} from '../zustand/continueWatchingStore';
import useWatchListStore from '../zustand/watchListStore';
import {getSafEntryName, isSafDownloadLocation} from '../downloadLocation';
import {
  getTombstoneKey,
  getDownloadMediaKey,
  MAX_SYNC_HISTORY_ITEMS,
  mergeSyncManifests,
  AIRFLIX_SYNC_SCHEMA_VERSION,
  type SyncTombstone,
  type SyncedDownload,
  type SyncedHistory,
  type SyncedWatchListItem,
  type AirflixSyncManifest,
} from './manifest';
import {
  readMobileSyncManifests,
  resolveMobileSyncFileWithLegacyFallback,
  writeMobileSyncManifest,
} from './mobileManifestStorage';

const DEVICE_ID_KEY = 'airflix-sync-device-id';
const REVISION_KEY = 'airflix-sync-revision';
const TOMBSTONES_KEY = 'airflix-sync-tombstones';
const HISTORY_KEY = 'airflix-sync-history';
const PUBLISH_DELAY_MS = 3000;

let initialized = false;
let applyingRemoteState = false;
let publishTimer: ReturnType<typeof setTimeout> | undefined;
let syncRequest: Promise<void> | undefined;
let previousDownloads: Record<string, DownloadItem> = {};
let previousHistory: ContinueWatchingItem[] = [];
let previousWatchList: WatchListItem[] = [];

const getDeviceId = () => {
  const existing = mainStorage.getString(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }
  const created = Crypto.randomUUID();
  mainStorage.setString(DEVICE_ID_KEY, created);
  return created;
};

const getTombstones = (): Record<string, SyncTombstone> =>
  mainStorage.getObject<Record<string, SyncTombstone>>(TOMBSTONES_KEY) || {};

const saveTombstones = (tombstones: Record<string, SyncTombstone>) =>
  mainStorage.setObject(TOMBSTONES_KEY, tombstones);

const addTombstone = (
  kind: SyncTombstone['kind'],
  id: string,
  mediaKey?: string,
) => {
  const tombstones = getTombstones();
  const key = getTombstoneKey(kind, id);
  tombstones[key] = {kind, id, mediaKey, deletedAt: Date.now()};
  saveTombstones(tombstones);
};

const getRelativePath = (item: DownloadItem) =>
  [
    (item.showName || item.title).replace(/[^a-z0-9]/gi, '_').toLowerCase(),
    ...(item.seasonTitle
      ? [item.seasonTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()]
      : []),
    getSafEntryName(item.finalDocumentUri || item.filePath) ||
      item.displayFileName ||
      item.id,
  ].join('/');

const toSyncedDownload = (item: DownloadItem): SyncedDownload => {
  const download: SyncedDownload = {
    id: item.id,
    title: item.title,
    showName: item.showName,
    episodeName: item.episodeName,
    seasonTitle: item.seasonTitle,
    type: item.type,
    imdbId: item.imdbId,
    poster: item.poster,
    background: item.background,
    synopsis: item.synopsis,
    provider: item.provider,
    infoUrl: item.infoUrl,
    sourceLink: item.sourceLink,
    relativePath: getRelativePath(item),
    totalBytes: item.totalBytes,
    completedAt: item.completedAt || item.updatedAt,
    updatedAt: item.updatedAt,
  };
  download.mediaKey = getDownloadMediaKey(download);
  return download;
};

const toSyncedWatchListItem = (item: WatchListItem): SyncedWatchListItem => ({
  ...item,
  updatedAt: item.updatedAt || 0,
});

const getHistoryId = (item: ContinueWatchingItem): string =>
  item.episode.sourceLink || item.episode.id || item.episode.link || item.id;

const toSyncedHistory = (item: ContinueWatchingItem): SyncedHistory => ({
  id: getHistoryId(item),
  title: item.title,
  poster: item.poster,
  background: item.background,
  provider: item.providerValue,
  link: item.infoUrl,
  duration: item.duration,
  progress: item.position,
  currentTime: item.position,
  isSeries: item.type === 'series',
  lastPlayed: item.updatedAt,
  episodeTitle: item.episodeTitle || item.episode.title,
  episode: item.episode,
  type: item.type,
  updatedAt: item.updatedAt,
});

const getLocalHistory = (): Record<string, SyncedHistory> =>
  mainStorage.getObject<Record<string, SyncedHistory>>(HISTORY_KEY) || {};

const saveLocalHistory = (history: Record<string, SyncedHistory>) => {
  const limited = Object.fromEntries(
    Object.entries(history)
      .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SYNC_HISTORY_ITEMS),
  );
  mainStorage.setObject(HISTORY_KEY, limited);
  return limited;
};

const mergeContinueWatchingIntoHistory = (items: ContinueWatchingItem[]) => {
  const history = getLocalHistory();
  items.forEach(item => {
    const synced = toSyncedHistory(item);
    const existing = history[synced.id];
    if (!existing || synced.updatedAt >= existing.updatedAt) {
      history[synced.id] = synced;
    }
  });
  return saveLocalHistory(history);
};

const buildManifest = (): AirflixSyncManifest => {
  const revision = (mainStorage.getNumber(REVISION_KEY) || 0) + 1;
  mainStorage.setNumber(REVISION_KEY, revision);
  const downloads = Object.fromEntries(
    Object.values(useDownloadsStore.getState().downloads)
      .filter(item => item.status === 'completed')
      .map(item => [item.id, toSyncedDownload(item)]),
  );
  const watchlist = Object.fromEntries(
    watchListStorage
      .getWatchList()
      .map(item => [item.link, toSyncedWatchListItem(item)]),
  );
  const history = mergeContinueWatchingIntoHistory(
    useContinueWatchingStore.getState().items,
  );
  return {
    schemaVersion: AIRFLIX_SYNC_SCHEMA_VERSION,
    deviceId: getDeviceId(),
    revision,
    generatedAt: Date.now(),
    downloads,
    history,
    watchlist,
    tombstones: getTombstones(),
  };
};

const applyRemoteHistory = (history: Record<string, SyncedHistory>) => {
  const limitedHistory = saveLocalHistory(history);
  const latestByInfoUrl = new Map<string, SyncedHistory>();
  Object.values(limitedHistory).forEach(item => {
    const episode = item.episode;
    const position = item.progress ?? item.currentTime ?? 0;
    const duration = item.duration ?? 0;
    if (episode?.link && duration > 0) {
      cacheStorage.setString(
        episode.link,
        JSON.stringify({position, duration}),
      );
    }
    if (!item.link || !item.provider) {
      return;
    }
    const existing = latestByInfoUrl.get(item.link);
    if (!existing || item.updatedAt > existing.updatedAt) {
      latestByInfoUrl.set(item.link, item);
    }
  });

  const items: ContinueWatchingItem[] = [...latestByInfoUrl.values()]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 30)
    .map(item => {
      const episode = item.episode || {
        id: item.id,
        title: item.episodeTitle || item.title,
        link: item.id,
        sourceLink: item.id,
      };
      const position = item.progress ?? item.currentTime ?? 0;
      const duration = item.duration ?? 0;
      return {
        id: item.link,
        title: item.title,
        episodeTitle:
          item.episodeTitle ||
          (episode.title !== item.title ? episode.title : undefined),
        episode,
        type: item.type || (item.isSeries ? 'series' : 'movie'),
        poster: item.poster,
        background: item.background,
        providerValue: item.provider!,
        infoUrl: item.link,
        position,
        duration,
        updatedAt: item.updatedAt,
      };
    });

  useContinueWatchingStore.setState({items});
};

export const publishSyncManifest = async (): Promise<void> => {
  const location = settingsStorage.getDownloadLocationConfig();
  if (!location || !isSafDownloadLocation(location)) {
    return;
  }
  await writeMobileSyncManifest(location, buildManifest());
};

const schedulePublish = () => {
  if (applyingRemoteState || publishTimer) {
    return;
  }
  publishTimer = setTimeout(() => {
    publishTimer = undefined;
    publishSyncManifest().catch(error =>
      console.warn('[AirflixSync] Failed to publish manifest:', error),
    );
  }, PUBLISH_DELAY_MS);
};

export const setSyncedEpisodeProgress = ({
  episode,
  title,
  poster,
  background,
  provider,
  infoUrl,
  type,
  position,
  duration,
}: {
  episode: ContinueWatchingItem['episode'];
  title: string;
  poster?: string;
  background?: string;
  provider: string;
  infoUrl: string;
  type: string;
  position: number;
  duration: number;
}) => {
  const id = episode.sourceLink || episode.id || episode.link;
  if (!id) {
    return;
  }
  const updatedAt = Date.now();
  const history = getLocalHistory();
  history[id] = {
    id,
    title,
    poster,
    background,
    provider,
    link: infoUrl,
    duration,
    progress: position,
    currentTime: position,
    isSeries: type === 'series',
    lastPlayed: updatedAt,
    episodeTitle: episode.title,
    episode,
    type,
    updatedAt,
  };
  saveLocalHistory(history);
  cacheStorage.setString(
    episode.link,
    JSON.stringify({position, duration}),
  );
  schedulePublish();
};

const applyRemoteDownloads = async (
  downloads: Record<string, SyncedDownload>,
) => {
  const location = settingsStorage.getDownloadLocationConfig();
  if (!location || !isSafDownloadLocation(location)) {
    return;
  }
  for (const item of Object.values(downloads)) {
    const store = useDownloadsStore.getState();
    const equivalentEntries = Object.entries(store.downloads).filter(
      ([, candidate]) =>
        candidate.status === 'completed' &&
        getDownloadMediaKey(toSyncedDownload(candidate)) === item.mediaKey,
    );
    const existing = equivalentEntries
      .map(([, candidate]) => candidate)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (
      existing?.status === 'completed' &&
      existing.updatedAt >= item.updatedAt
    ) {
      equivalentEntries
        .filter(([id]) => id !== existing.id)
        .forEach(([id]) => store.removeDownload(id));
      continue;
    }
    const filePath = await resolveMobileSyncFileWithLegacyFallback(
      location,
      item.relativePath,
    );
    if (!filePath) {
      continue;
    }
    store.enqueueDownload({
      ...item,
      url: '',
      filePath,
      finalDocumentUri: filePath,
      displayFileName: item.relativePath.split('/').pop(),
      status: 'completed',
      sourceType: 'http',
      isTorrent: false,
      downloadedBytes: item.totalBytes,
      canPause: false,
      canResume: false,
      createdAt: item.completedAt,
      updatedAt: item.updatedAt,
      completedAt: item.completedAt,
      downloadLocation: location,
    });
    equivalentEntries
      .filter(([id]) => id !== item.id)
      .forEach(([id]) => store.removeDownload(id));
  }
};

const applyRemoteWatchList = (
  watchlist: Record<string, SyncedWatchListItem>,
) => {
  const items = Object.values(watchlist).sort(
    (a, b) => a.updatedAt - b.updatedAt,
  );
  mainStorage.setArray(WatchListKeys.WATCH_LIST, items);
  useWatchListStore.setState({watchList: items});
};

const applyTombstones = (tombstones: Record<string, SyncTombstone>) => {
  const store = useDownloadsStore.getState();
  let history = useContinueWatchingStore.getState().items;
  const localHistory = getLocalHistory();
  for (const tombstone of Object.values(tombstones)) {
    if (tombstone.kind === 'download') {
      for (const item of Object.values(store.downloads)) {
        const matches =
          item.id === tombstone.id ||
          (tombstone.mediaKey &&
            item.status === 'completed' &&
            getDownloadMediaKey(toSyncedDownload(item)) === tombstone.mediaKey);
        if (matches && tombstone.deletedAt >= item.updatedAt) {
          store.removeDownload(item.id);
        }
      }
    } else if (tombstone.kind === 'history') {
      const syncedItem = localHistory[tombstone.id];
      if (syncedItem && tombstone.deletedAt >= syncedItem.updatedAt) {
        delete localHistory[tombstone.id];
      }
      history = history.filter(
        item =>
          getHistoryId(item) !== tombstone.id ||
          item.updatedAt > tombstone.deletedAt,
      );
    }
  }
  saveLocalHistory(localHistory);
  useContinueWatchingStore.setState({items: history});
};

const runSharedFolderSync = async (): Promise<void> => {
  if (publishTimer) {
    clearTimeout(publishTimer);
    publishTimer = undefined;
  }
  const location = settingsStorage.getDownloadLocationConfig();
  if (!location || !isSafDownloadLocation(location)) {
    return;
  }
  const manifests = await readMobileSyncManifests(location);
  const localManifest = buildManifest();
  const merged = mergeSyncManifests([...manifests, localManifest]);
  applyingRemoteState = true;
  try {
    saveTombstones(merged.tombstones);
    applyTombstones(merged.tombstones);
    await applyRemoteDownloads(merged.downloads);
    applyRemoteHistory(merged.history);
    applyRemoteWatchList(merged.watchlist);
  } finally {
    applyingRemoteState = false;
  }
  previousDownloads = useDownloadsStore.getState().downloads;
  previousHistory = useContinueWatchingStore.getState().items;
  previousWatchList = watchListStorage.getWatchList();
  await publishSyncManifest();
};

export const syncFromSharedFolder = (): Promise<void> => {
  if (!syncRequest) {
    syncRequest = runSharedFolderSync().finally(() => {
      syncRequest = undefined;
    });
  }
  return syncRequest;
};

export const initializeSyncService = async (): Promise<void> => {
  if (!initialized) {
    initialized = true;
    previousDownloads = useDownloadsStore.getState().downloads;
    previousHistory = useContinueWatchingStore.getState().items;
    mergeContinueWatchingIntoHistory(previousHistory);
    previousWatchList = watchListStorage.getWatchList();
    useDownloadsStore.subscribe(state => {
      if (applyingRemoteState) {
        previousDownloads = state.downloads;
        return;
      }
      for (const [id, item] of Object.entries(previousDownloads)) {
        if (item.status === 'completed' && !state.downloads[id]) {
          addTombstone(
            'download',
            id,
            getDownloadMediaKey(toSyncedDownload(item)),
          );
        }
      }
      previousDownloads = state.downloads;
      schedulePublish();
    });
    useContinueWatchingStore.subscribe(state => {
      if (applyingRemoteState) {
        previousHistory = state.items;
        return;
      }
      mergeContinueWatchingIntoHistory(state.items);
      const currentContentIds = new Set(state.items.map(item => item.id));
      const previousContentIds = new Set(previousHistory.map(item => item.id));
      const trimmedAtCapacity =
        previousHistory.length >= 30 &&
        state.items.length >= 30 &&
        state.items.some(item => !previousContentIds.has(item.id));
      for (const item of previousHistory) {
        if (!currentContentIds.has(item.id) && !trimmedAtCapacity) {
          const history = getLocalHistory();
          for (const [id, historyItem] of Object.entries(history)) {
            if (historyItem.link === item.infoUrl) {
              delete history[id];
              addTombstone('history', id);
            }
          }
          saveLocalHistory(history);
        }
      }
      previousHistory = state.items;
      schedulePublish();
    });
    useWatchListStore.subscribe(state => {
      if (applyingRemoteState) {
        previousWatchList = watchListStorage.getWatchList();
        return;
      }
      const currentLinks = new Set(state.watchList.map(item => item.link));
      for (const item of previousWatchList) {
        if (!currentLinks.has(item.link)) {
          addTombstone('watchlist', item.link);
        }
      }
      previousWatchList = watchListStorage.getWatchList();
      schedulePublish();
    });
  }
  await syncFromSharedFolder();
};
