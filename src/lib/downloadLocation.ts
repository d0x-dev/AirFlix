import * as RNFS from '@dr.pogodin/react-native-fs';
import * as FileSystem from 'expo-file-system/legacy';
import {NativeModules, Platform} from 'react-native';

export type PathDownloadLocation = {
  type: 'path';
  path: string;
  label?: string;
};

export type SafDownloadLocation = {
  type: 'saf';
  uri: string;
  label: string;
};

export type DownloadLocationConfig = PathDownloadLocation | SafDownloadLocation;

const DOWNLOAD_LOCATION_PREFIX = 'download-location:';

export const serializeDownloadLocation = (
  config: DownloadLocationConfig,
): string => {
  return `${DOWNLOAD_LOCATION_PREFIX}${JSON.stringify(config)}`;
};

export const parseDownloadLocation = (
  storedValue?: string | null,
): DownloadLocationConfig | null => {
  if (!storedValue) {
    return null;
  }

  if (!storedValue.startsWith(DOWNLOAD_LOCATION_PREFIX)) {
    if (Platform.OS === 'android') {
      return null;
    }
    return {
      type: 'path',
      path: storedValue,
      label: storedValue,
    };
  }

  try {
    const parsed = JSON.parse(
      storedValue.slice(DOWNLOAD_LOCATION_PREFIX.length),
    ) as DownloadLocationConfig;

    if (parsed.type === 'saf' && parsed.uri && parsed.label) {
      return parsed;
    }

    if (parsed.type === 'path' && parsed.path && Platform.OS !== 'android') {
      return {
        type: 'path',
        path: parsed.path,
        label: parsed.label || parsed.path,
      };
    }
  } catch (error) {
    console.log('Failed to parse download location:', error);
  }

  return null;
};

export const isSafDownloadLocation = (
  config: DownloadLocationConfig,
): config is SafDownloadLocation => {
  return config.type === 'saf';
};

export const getDownloadLocationDisplayValue = (
  config?: DownloadLocationConfig | null,
): string => {
  if (!config) {
    return 'Select a download folder';
  }
  return config.type === 'saf' ? config.label : config.path;
};

export const getDownloadLocationPath = (
  config?: DownloadLocationConfig | null,
): string | null => {
  return config?.type === 'path' ? config.path : null;
};

export const getAndroidDirectoryLabel = (directoryUri: string): string => {
  const treeMarker = '/tree/';
  const treeIndex = directoryUri.indexOf(treeMarker);
  if (treeIndex === -1) {
    return 'Custom folder';
  }

  const documentId = decodeURIComponent(
    directoryUri.slice(treeIndex + treeMarker.length),
  );
  const [volume, relativePath = ''] = documentId.split(':');
  if (!relativePath) {
    return volume === 'primary' ? 'Internal storage' : volume;
  }
  return `${volume === 'primary' ? 'Internal storage' : volume}/${relativePath}`;
};

export const selectDownloadLocation = async (): Promise<
  DownloadLocationConfig | undefined
> => {
  if (Platform.OS === 'android') {
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      return undefined;
    }
    return {
      type: 'saf',
      uri: permissions.directoryUri,
      label: getAndroidDirectoryLabel(permissions.directoryUri),
    };
  }

  const pickedFolders = await RNFS.pickFile({pickerType: 'folder'});
  const pickedFolder = pickedFolders[0];
  if (!pickedFolder) {
    return undefined;
  }
  const path = pickedFolder.replace(/^file:\/\//, '');
  return {type: 'path', path, label: path};
};

export const validateDownloadLocationAccess = async (
  location?: DownloadLocationConfig | null,
): Promise<boolean> => {
  if (!location) {
    return false;
  }
  try {
    if (location.type === 'saf') {
      await FileSystem.StorageAccessFramework.readDirectoryAsync(location.uri);
      return true;
    }
    if (Platform.OS === 'android') {
      return false;
    }
    if (!(await RNFS.exists(location.path))) {
      await RNFS.mkdir(location.path);
    }
    return true;
  } catch (error) {
    console.log('Download location is unavailable:', error);
    return false;
  }
};

export const ensureDownloadLocationAccess = async (
  location?: DownloadLocationConfig | null,
): Promise<DownloadLocationConfig | undefined> => {
  if (await validateDownloadLocationAccess(location)) {
    return location || undefined;
  }
  const selectedLocation = await selectDownloadLocation();
  return (await validateDownloadLocationAccess(selectedLocation))
    ? selectedLocation
    : undefined;
};

export const getDownloadFileName = (fileName: string, fileType: string) => {
  return `${fileName}.${fileType}`;
};

export const getSafEntryName = (entryUri: string): string => {
  const decodedUri = decodeURIComponent(entryUri);
  return decodedUri.slice(decodedUri.lastIndexOf('/') + 1);
};

export const getOrCreateSafDirectory = async (
  parentUri: string,
  directoryName: string,
): Promise<string> => {
  const entries =
    await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);
  const existing = entries.find(
    entry => getSafEntryName(entry) === directoryName,
  );
  return (
    existing ||
    FileSystem.StorageAccessFramework.makeDirectoryAsync(
      parentUri,
      directoryName,
    )
  );
};

export const findSafEntryByName = async (
  parentUri: string,
  entryName: string,
): Promise<string | undefined> => {
  const entries =
    await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);
  return entries.find(entry => getSafEntryName(entry) === entryName);
};

export const findDownloadedFileByBaseName = async (
  location: DownloadLocationConfig | null,
  fileName: string,
) => {
  if (!location) {
    return false;
  }
  try {
    if (location.type === 'path') {
      const files = await RNFS.readDir(location.path);

      const file = files.find(fileItem => {
        const nameWithoutExtension = fileItem.name
          .split('.')
          .slice(0, -1)
          .join('.');
        return nameWithoutExtension === fileName;
      });

      return file ? file.path : false;
    }

    const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
      location.uri,
    );

    const file = files.find(fileUri => {
      const entryName = getSafEntryName(fileUri);
      const nameWithoutExtension = entryName.split('.').slice(0, -1).join('.');
      return nameWithoutExtension === fileName;
    });

    return file || false;
  } catch (error) {
    console.log('Error reading download location:', error);
    return false;
  }
};

export const getDownloadMimeType = (fileType: string) => {
  switch (fileType.toLowerCase()) {
    case 'mp4':
      return 'video/mp4';
    case 'mkv':
      return 'video/x-matroska';
    case 'mov':
      return 'video/quicktime';
    case 'avi':
      return 'video/x-msvideo';
    case 'srt':
      return 'application/x-subrip';
    case 'vtt':
      return 'text/vtt';
    case 'ass':
      return 'text/plain';
    case 'mp3':
      return 'audio/mpeg';
    default:
      return 'application/octet-stream';
  }
};

export const copyFileToSaf = async ({
  fromPath,
  directoryUri,
  fileName,
  fileType,
}: {
  fromPath: string;
  directoryUri: string;
  fileName: string;
  fileType: string;
}) => {
  const targetFileName = getDownloadFileName(fileName, fileType);
  const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
    directoryUri,
    targetFileName,
    getDownloadMimeType(fileType),
  );

  const safCopyModule = NativeModules.SafCopyModule as
    | {
        copyFileToUri: (
          fromFilePath: string,
          toFileUri: string,
        ) => Promise<void>;
      }
    | undefined;

  try {
    if (!safCopyModule?.copyFileToUri) {
      throw new Error('SAF file copy bridge is unavailable');
    }

    await safCopyModule.copyFileToUri(fromPath, fileUri);
    return fileUri;
  } catch (error) {
    await FileSystem.StorageAccessFramework.deleteAsync(fileUri).catch(() => {
      return;
    });
    throw error;
  }
};

export const deleteDownloadedFileByBaseName = async (
  location: DownloadLocationConfig | null,
  fileName: string,
) => {
  const foundFile = await findDownloadedFileByBaseName(location, fileName);

  if (!foundFile) {
    return false;
  }

  if (location?.type === 'path') {
    await RNFS.unlink(foundFile);
    return true;
  }

  await FileSystem.StorageAccessFramework.deleteAsync(foundFile);
  return true;
};
