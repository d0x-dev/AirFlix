import {NativeModules, Platform} from 'react-native';

type UriPermissionModuleType = {
  takePersistableUriPermission: (uri: string) => Promise<boolean>;
  releasePersistableUriPermission: (uri: string) => Promise<boolean>;
  getPersistedUriPermissions: () => Promise<string[]>;
};

const getUriPermissionModule = (): UriPermissionModuleType | undefined =>
  NativeModules.UriPermissionModule as UriPermissionModuleType | undefined;

// Ask Android to remember read access to a SAF (content://) uri across app
// restarts, without copying the underlying file. Used for locally-picked
// video files so multi-gigabyte movies/episodes don't have to be duplicated
// into app cache just to survive being resumed from Continue Watching.
//
// Resolves to false (never throws) if the grant couldn't be persisted —
// callers should treat that as "this session only" rather than an error,
// since some content providers don't support persistable permissions.
export const takePersistableUriPermission = async (
  uri: string,
): Promise<boolean> => {
  if (Platform.OS !== 'android' || !uri?.startsWith('content://')) {
    return false;
  }
  try {
    const module = getUriPermissionModule();
    if (!module?.takePersistableUriPermission) {
      return false;
    }
    await module.takePersistableUriPermission(uri);
    return true;
  } catch (error) {
    console.warn('Failed to persist uri permission for', uri, error);
    return false;
  }
};

// Frees a previously-persisted grant. Android only allows a limited number
// of persisted uri permissions per app, so we release the old one whenever
// the user picks a different local file or switches away from local
// playback for an episode.
export const releasePersistableUriPermission = async (
  uri?: string,
): Promise<void> => {
  if (!uri || Platform.OS !== 'android' || !uri.startsWith('content://')) {
    return;
  }
  try {
    const module = getUriPermissionModule();
    await module?.releasePersistableUriPermission?.(uri);
  } catch (error) {
    console.warn('Failed to release uri permission for', uri, error);
  }
};
