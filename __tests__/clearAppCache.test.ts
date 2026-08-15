const mockClearMMKVCache = jest.fn();
const mockClearQueries = jest.fn();
const mockClearImageColors = jest.fn();
const mockClearImageAccents = jest.fn();
const mockClearHero = jest.fn();
const mockUnlink = jest.fn(() => Promise.resolve());

jest.mock('@dr.pogodin/react-native-fs', () => ({
  CachesDirectoryPath: '/cache',
  readDir: jest.fn(() =>
    Promise.resolve([
      {name: 'downloads', path: '/cache/downloads'},
      {name: 'hls_segments', path: '/cache/hls_segments'},
      {name: 'temporary-update.apk', path: '/cache/temporary-update.apk'},
      {name: 'images', path: '/cache/images'},
    ]),
  ),
  unlink: (path: string) => mockUnlink(path),
}));

jest.mock('react-native-image-colors', () => ({
  cache: {clear: () => mockClearImageColors()},
}));

jest.mock('../src/lib/client', () => ({
  queryClient: {clear: () => mockClearQueries()},
}));

jest.mock('../src/lib/hooks/useHomePageData', () => ({
  clearHeroCache: () => mockClearHero(),
}));

jest.mock('../src/lib/imageAccent', () => ({
  clearImageAccentCache: () => mockClearImageAccents(),
}));

jest.mock('../src/lib/storage', () => ({
  cacheStorageService: {clearAll: () => mockClearMMKVCache()},
}));

import {clearAppCache} from '../src/lib/clearAppCache';

describe('clearAppCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears cache layers while preserving download staging', async () => {
    await clearAppCache();

    expect(mockClearMMKVCache).toHaveBeenCalledTimes(1);
    expect(mockClearQueries).toHaveBeenCalledTimes(1);
    expect(mockClearImageColors).toHaveBeenCalledTimes(1);
    expect(mockClearImageAccents).toHaveBeenCalledTimes(1);
    expect(mockClearHero).toHaveBeenCalledTimes(1);
    expect(mockUnlink).toHaveBeenCalledTimes(2);
    expect(mockUnlink).toHaveBeenCalledWith('/cache/temporary-update.apk');
    expect(mockUnlink).toHaveBeenCalledWith('/cache/images');
    expect(mockUnlink).not.toHaveBeenCalledWith('/cache/downloads');
    expect(mockUnlink).not.toHaveBeenCalledWith('/cache/hls_segments');
  });
});
