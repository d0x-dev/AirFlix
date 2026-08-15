import * as RNFS from '@dr.pogodin/react-native-fs';
import {downloadsStorage} from './storage/DownloadsStorage';
import {getVideoThumbnail} from './videoThumbnail';

const THUMBNAIL_TIMESTAMP_MS = 30_000;
const thumbnailUris = new Map<string, string>(
  Object.entries(downloadsStorage.getThumbnails() || {}),
);
const inFlight = new Map<string, Promise<string>>();
let extractionQueue: Promise<void> = Promise.resolve();
let cacheGeneration = 0;

const getCacheKey = (filePath: string): string =>
  `${filePath}|${THUMBNAIL_TIMESTAMP_MS}`;

const uriToPath = (uri: string): string => {
  if (!uri.startsWith('file://')) {
    return uri;
  }
  try {
    return decodeURIComponent(uri.slice('file://'.length));
  } catch {
    return uri.slice('file://'.length);
  }
};

const persistThumbnailUris = (): void => {
  downloadsStorage.saveThumbnails(Object.fromEntries(thumbnailUris));
};

const enqueueExtraction = <T>(task: () => Promise<T>): Promise<T> => {
  const result = extractionQueue.catch(() => undefined).then(task);
  extractionQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

export const getDownloadedVideoThumbnail = async (
  filePath: string,
): Promise<string> => {
  const key = getCacheKey(filePath);
  const cachedUri = thumbnailUris.get(key);
  if (cachedUri) {
    if (await RNFS.exists(uriToPath(cachedUri)).catch(() => false)) {
      return cachedUri;
    }
    thumbnailUris.delete(key);
    persistThumbnailUris();
  }

  const existingRequest = inFlight.get(key);
  if (existingRequest) {
    return existingRequest;
  }

  const requestGeneration = cacheGeneration;
  const request = enqueueExtraction(async () => {
    const result = await getVideoThumbnail(
      filePath,
      THUMBNAIL_TIMESTAMP_MS,
      {},
      {
        cache: true,
        maxWidth: 320,
        maxHeight: 180,
        quality: 80,
      },
    );
    if (requestGeneration === cacheGeneration) {
      thumbnailUris.set(key, result.uri);
      persistThumbnailUris();
    }
    return result.uri;
  }).finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, request);
  return request;
};

export const clearDownloadedVideoThumbnailMemoryCache = (): void => {
  cacheGeneration += 1;
  thumbnailUris.clear();
  inFlight.clear();
};
