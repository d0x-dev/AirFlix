import {beforeEach, describe, expect, it, jest} from '@jest/globals';

jest.mock('@dr.pogodin/react-native-fs', () => ({
  pickFile: jest.fn(),
  readDir: jest.fn(),
  exists: jest.fn(),
  mkdir: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  StorageAccessFramework: {
    readDirectoryAsync: jest.fn(async () => []),
    requestDirectoryPermissionsAsync: jest.fn(async () => ({
      granted: true,
      directoryUri: 'content://downloads/tree/primary%3AMovies',
    })),
  },
}));

jest.mock('react-native', () => ({
  NativeModules: {},
  Platform: {OS: 'android'},
}));

import {
  ensureDownloadLocationAccess,
  parseDownloadLocation,
  serializeDownloadLocation,
} from '../src/lib/downloadLocation';
import * as FileSystem from 'expo-file-system/legacy';

const mockReadDirectory = FileSystem.StorageAccessFramework
  .readDirectoryAsync as jest.Mock;
const mockRequestDirectory = FileSystem.StorageAccessFramework
  .requestDirectoryPermissionsAsync as jest.Mock;

describe('Android SAF download location', () => {
  beforeEach(() => {
    mockReadDirectory.mockClear();
    mockRequestDirectory.mockClear();
  });

  it('does not activate a legacy raw path', () => {
    expect(
      parseDownloadLocation('/storage/emulated/0/Download/airflix'),
    ).toBeNull();
  });

  it('restores a persisted SAF tree', () => {
    const location = {
      type: 'saf' as const,
      uri: 'content://downloads/tree',
      label: 'Downloads',
    };
    expect(parseDownloadLocation(serializeDownloadLocation(location))).toEqual(
      location,
    );
  });

  it('opens SAF when no valid location exists', async () => {
    await expect(ensureDownloadLocationAccess(null)).resolves.toEqual({
      type: 'saf',
      uri: 'content://downloads/tree/primary%3AMovies',
      label: 'Internal storage/Movies',
    });
    expect(mockRequestDirectory).toHaveBeenCalledTimes(1);
  });
});
