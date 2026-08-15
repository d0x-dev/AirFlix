import {settingsStorage} from '../storage';
import {findDownloadedFileByBaseName} from '../downloadLocation';

export const ifExists = async (fileName: string) => {
  const result = await findDownloadedFileByBaseName(
    settingsStorage.getDownloadLocationConfig(),
    fileName,
  );
  if (!result) {
    return false;
  }
  return result;
};
