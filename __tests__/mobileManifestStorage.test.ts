import {beforeEach, describe, expect, it, jest} from '@jest/globals';

const syncDirectoryUri =
  'content://storage/tree/primary%3Aairflix/document/primary%3Aairflix%2F.airflix-sync';
const manifestUri = `${syncDirectoryUri}%2Fairflix-mobile.json`;

jest.mock('expo-file-system/legacy', () => ({
  StorageAccessFramework: {
    createFileAsync: jest.fn(),
    deleteAsync: jest.fn(),
    makeDirectoryAsync: jest.fn(),
    readAsStringAsync: jest.fn(),
    readDirectoryAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
  },
}));

jest.mock('../src/lib/downloadLocation', () => ({
  getSafEntryName: (uri: string) => {
    const decoded = decodeURIComponent(uri);
    return decoded.slice(decoded.lastIndexOf('/') + 1);
  },
}));

import * as FileSystem from 'expo-file-system/legacy';
import {writeMobileSyncManifest} from '../src/lib/sync/mobileManifestStorage';
import type {AirflixSyncManifest} from '../src/lib/sync/manifest';

const location = {
  type: 'saf' as const,
  uri: 'content://storage/tree/primary%3Aairflix',
  label: 'Internal storage/airflix',
};

const manifest = (revision: number): AirflixSyncManifest => ({
  schemaVersion: 1,
  deviceId: 'mobile',
  revision,
  generatedAt: revision,
  downloads: {},
  history: {},
  watchlist: {},
  tombstones: {},
});

const storage = FileSystem.StorageAccessFramework;
const mockCreateFile = storage.createFileAsync as jest.MockedFunction<
  typeof storage.createFileAsync
>;
const mockDelete = storage.deleteAsync as jest.MockedFunction<
  typeof storage.deleteAsync
>;
const mockReadAsString = storage.readAsStringAsync as jest.MockedFunction<
  typeof storage.readAsStringAsync
>;
const mockReadDirectory = storage.readDirectoryAsync as jest.MockedFunction<
  typeof storage.readDirectoryAsync
>;
const mockWriteAsString = storage.writeAsStringAsync as jest.MockedFunction<
  typeof storage.writeAsStringAsync
>;

describe('mobile sync manifest storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadDirectory.mockImplementation(async uri =>
      uri === location.uri ? [syncDirectoryUri] : [manifestUri],
    );
    mockReadAsString.mockImplementation(async () =>
      JSON.stringify(manifest(1)),
    );
  });

  it('overwrites the existing SAF document without deleting and recreating it', async () => {
    await writeMobileSyncManifest(location, manifest(2));

    expect(mockCreateFile).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockWriteAsString).toHaveBeenCalledWith(
      manifestUri,
      JSON.stringify(manifest(2)),
    );
  });

  it('creates the manifest only when no existing document is present', async () => {
    mockReadDirectory.mockImplementation(async uri =>
      uri === location.uri ? [syncDirectoryUri] : [],
    );
    mockCreateFile.mockResolvedValue(manifestUri);

    await writeMobileSyncManifest(location, manifest(2));

    expect(mockCreateFile).toHaveBeenCalledTimes(1);
    expect(mockCreateFile).toHaveBeenCalledWith(
      syncDirectoryUri,
      'airflix-mobile.json',
      'application/json',
    );
  });

  it('serializes concurrent writes so they cannot create duplicate documents', async () => {
    let fileExists = false;
    mockReadDirectory.mockImplementation(async uri =>
      uri === location.uri
        ? [syncDirectoryUri]
        : fileExists
          ? [manifestUri]
          : [],
    );
    mockCreateFile.mockImplementation(async () => {
      fileExists = true;
      return manifestUri;
    });

    await Promise.all([
      writeMobileSyncManifest(location, manifest(2)),
      writeMobileSyncManifest(location, manifest(3)),
    ]);

    expect(mockCreateFile).toHaveBeenCalledTimes(1);
    expect(mockWriteAsString).toHaveBeenNthCalledWith(
      2,
      manifestUri,
      JSON.stringify(manifest(3)),
    );
  });
});
