import * as RNFS from '@dr.pogodin/react-native-fs';
import * as FileSystem from 'expo-file-system/legacy';
import {NativeModules} from 'react-native';
import {
  copyFileToSaf,
  DownloadLocationConfig,
  findSafEntryByName,
  getDownloadFileName,
  getDownloadMimeType,
  getOrCreateSafDirectory,
  isSafDownloadLocation,
  validateDownloadLocationAccess,
} from './downloadLocation';
import {sanitizeDownloadFileName} from './downloadId';

const DOWNLOAD_STAGING_ROOT = `${RNFS.CachesDirectoryPath}/downloads`;

type SafCopyModule = {
  getUriSize?: (uri: string) => Promise<number>;
};

export interface PreparedDownloadDestination {
  stagingDirectory: string;
  stagingPath: string;
  directFinalDocumentUri?: string;
}

export interface FinalizedDownloadOutput {
  filePath: string;
  finalDocumentUri?: string;
  size: number;
}

const getSafCopyModule = (): SafCopyModule | undefined =>
  (NativeModules.HttpDownloadModule || NativeModules.SafCopyModule) as
    | SafCopyModule
    | undefined;

export const getDownloadStagingDirectory = (downloadId: string): string =>
  `${DOWNLOAD_STAGING_ROOT}/${sanitizeDownloadFileName(downloadId)}`;

export const getDownloadStagingPath = (
  downloadId: string,
  fileName: string,
  fileType: string,
): string =>
  `${getDownloadStagingDirectory(downloadId)}/${getDownloadFileName(
    fileName,
    fileType,
  )}.part`;

export const validateDownloadLocation = async (
  location: DownloadLocationConfig,
): Promise<boolean> => validateDownloadLocationAccess(location);

export const prepareDownloadDestination = async ({
  downloadId,
  location,
  fileName,
  fileType,
  directToSaf = false,
  existingFinalDocumentUri,
  outputDirectoryNames,
}: {
  downloadId: string;
  location: DownloadLocationConfig;
  fileName: string;
  fileType: string;
  directToSaf?: boolean;
  existingFinalDocumentUri?: string;
  outputDirectoryNames?: string[];
}): Promise<PreparedDownloadDestination> => {
  if (!(await validateDownloadLocation(location))) {
    throw new Error('Download location is unavailable');
  }

  if (directToSaf) {
    if (!isSafDownloadLocation(location)) {
      throw new Error('SAF download location is required');
    }

    if (
      existingFinalDocumentUri &&
      (await downloadOutputExists(existingFinalDocumentUri))
    ) {
      return {
        stagingDirectory: '',
        stagingPath: existingFinalDocumentUri,
        directFinalDocumentUri: existingFinalDocumentUri,
      };
    }

    let directoryUri = location.uri;
    for (const directoryName of outputDirectoryNames || []) {
      directoryUri = await getOrCreateSafDirectory(directoryUri, directoryName);
    }
    const directFinalDocumentUri =
      await FileSystem.StorageAccessFramework.createFileAsync(
        directoryUri,
        getDownloadFileName(fileName, fileType),
        getDownloadMimeType(fileType),
      );
    return {
      stagingDirectory: '',
      stagingPath: directFinalDocumentUri,
      directFinalDocumentUri,
    };
  }

  const stagingDirectory = getDownloadStagingDirectory(downloadId);
  if (await RNFS.exists(stagingDirectory)) {
    await RNFS.unlink(stagingDirectory);
  }
  await RNFS.mkdir(stagingDirectory);

  return {
    stagingDirectory,
    stagingPath: getDownloadStagingPath(downloadId, fileName, fileType),
  };
};

const getLocalFileSize = async (path: string): Promise<number> => {
  const stat = await RNFS.stat(path);
  return Number(stat.size);
};

const getSafFileSize = async (uri: string): Promise<number> => {
  const nativeSize = await getSafCopyModule()?.getUriSize?.(uri);
  if (typeof nativeSize === 'number' && nativeSize >= 0) {
    return nativeSize;
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || !('size' in info) || typeof info.size !== 'number') {
    throw new Error('Unable to verify the SAF destination file');
  }
  return info.size;
};

export const getDownloadOutputSize = async (uri: string): Promise<number> =>
  getSafFileSize(uri);

export const cleanupDownloadStaging = async (
  downloadId: string,
): Promise<void> => {
  const stagingDirectory = getDownloadStagingDirectory(downloadId);
  if (await RNFS.exists(stagingDirectory)) {
    await RNFS.unlink(stagingDirectory);
  }
};

export const finalizeDownloadOutput = async ({
  downloadId,
  location,
  stagingPath,
  fileName,
  fileType,
  outputDirectoryNames,
  directFinalDocumentUri,
}: {
  downloadId: string;
  location: DownloadLocationConfig;
  stagingPath: string;
  fileName: string;
  fileType: string;
  outputDirectoryNames?: string[];
  directFinalDocumentUri?: string;
}): Promise<FinalizedDownloadOutput> => {
  if (directFinalDocumentUri) {
    const destinationSize = await getSafFileSize(directFinalDocumentUri);
    if (destinationSize <= 0) {
      throw new Error('Downloaded SAF file is empty');
    }
    return {
      filePath: directFinalDocumentUri,
      finalDocumentUri: directFinalDocumentUri,
      size: destinationSize,
    };
  }

  if (!(await RNFS.exists(stagingPath))) {
    throw new Error('Downloaded staging file is missing');
  }

  const sourceSize = await getLocalFileSize(stagingPath);
  if (sourceSize <= 0) {
    throw new Error('Downloaded staging file is empty');
  }

  if (!isSafDownloadLocation(location)) {
    throw new Error('SAF download location is required');
  }

  let directoryUri = location.uri;
  for (const directoryName of outputDirectoryNames || []) {
    directoryUri = await getOrCreateSafDirectory(directoryUri, directoryName);
  }
  const fileUri = await copyFileToSaf({
    fromPath: stagingPath,
    directoryUri,
    fileName,
    fileType,
  });
  const destinationSize = await getSafFileSize(fileUri);
  if (destinationSize !== sourceSize) {
    await FileSystem.StorageAccessFramework.deleteAsync(fileUri).catch(
      () => undefined,
    );
    throw new Error('SAF destination size does not match the download');
  }

  await cleanupDownloadStaging(downloadId);
  return {
    filePath: fileUri,
    finalDocumentUri: fileUri,
    size: destinationSize,
  };
};

export const deleteDownloadOutput = async (
  filePath: string,
  options?: {
    downloadLocation?: DownloadLocationConfig;
    outputDirectoryNames?: string[];
  },
): Promise<boolean> => {
  if (!filePath) {
    return false;
  }

  if (filePath.startsWith('content://')) {
    const info = await FileSystem.getInfoAsync(filePath).catch(() => ({
      exists: false,
    }));
    if (info.exists) {
      await FileSystem.StorageAccessFramework.deleteAsync(filePath).catch(
        () => undefined,
      );
    }
    const location = options?.downloadLocation;
    if (location && isSafDownloadLocation(location)) {
      try {
        const directoryUris: string[] = [];
        let currentUri = location.uri;
        for (const directoryName of options?.outputDirectoryNames || []) {
          const child = await findSafEntryByName(currentUri, directoryName);
          if (!child) {
            break;
          }
          directoryUris.push(child);
          currentUri = child;
        }
        for (const directoryUri of directoryUris.reverse()) {
          const entries =
            await FileSystem.StorageAccessFramework.readDirectoryAsync(
              directoryUri,
            ).catch(() => []);
          if (entries.length > 0) {
            break;
          }
          await FileSystem.StorageAccessFramework.deleteAsync(
            directoryUri,
          ).catch(() => undefined);
        }
      } catch {}
    }
    return true;
  }

  const localPath = filePath.replace(/^file:\/\//, '');
  if (await RNFS.exists(localPath)) {
    await RNFS.unlink(localPath);
  }
  return true;
};

export const downloadOutputExists = async (
  filePath?: string,
): Promise<boolean> => {
  if (!filePath) {
    return false;
  }
  if (filePath.startsWith('content://')) {
    return FileSystem.getInfoAsync(filePath)
      .then(info => info.exists)
      .catch(() => false);
  }
  return RNFS.exists(filePath.replace(/^file:\/\//, '')).catch(() => false);
};
