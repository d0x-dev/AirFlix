import {ifExists} from './file/ifExists';
import {
  ensureDownloadLocationAccess,
  getDownloadFileName,
} from './downloadLocation';
import {scheduleQueuedDownloads} from './downloadManager';
import {settingsStorage} from './storage';
import useDownloadsStore, {
  DownloadMediaInput,
  DownloadSubtitle,
  DownloadSourceType,
} from './zustand/downloadsStore';

const getSourceType = (url: string, fileType: string): DownloadSourceType => {
  if (fileType === 'torrent' || url.startsWith('magnet:')) {
    return 'torrent';
  }
  if (fileType === 'm3u8') {
    return 'hls';
  }
  return 'http';
};

export const downloadManager = async ({
  downloadId,
  title,
  showName,
  episodeName,
  seasonTitle,
  mediaType,
  imdbId,
  poster,
  background,
  synopsis,
  provider,
  infoUrl,
  sourceLink,
  url,
  fileName,
  fileType,
  headers,
  subtitles,
}: {
  downloadId: string;
  title: string;
  showName?: string;
  episodeName?: string;
  seasonTitle?: string;
  mediaType: 'movie' | 'series';
  imdbId?: string;
  poster?: string;
  background?: string;
  synopsis?: string;
  provider?: string;
  infoUrl?: string;
  sourceLink?: string;
  url: string;
  fileName: string;
  fileType: string;
  headers?: Record<string, string>;
  subtitles?: DownloadSubtitle[];
  deleteDownload: () => void;
}): Promise<void> => {
  const store = useDownloadsStore.getState();
  if (store.downloads[downloadId]?.status === 'completed') {
    return;
  }

  const downloadLocation = await ensureDownloadLocationAccess(
    settingsStorage.getDownloadLocationConfig(),
  );
  if (!downloadLocation) {
    return;
  }
  settingsStorage.setDownloadLocation(downloadLocation);

  const outputFileType = fileType === 'm3u8' ? 'mp4' : fileType;
  const media: DownloadMediaInput = {
    id: downloadId,
    title,
    showName,
    episodeName,
    seasonTitle,
    type: mediaType,
    imdbId,
    poster,
    background,
    synopsis,
    provider,
    infoUrl,
    sourceLink,
    subtitles,
    displayFileName: getDownloadFileName(fileName, outputFileType),
  };
  const existingFile = await ifExists(fileName);
  if (existingFile) {
    store.enqueueDownload({
      ...media,
      url,
      headers,
      videoType: outputFileType,
      sourceType: getSourceType(url, fileType),
      filePath: String(existingFile),
      status: 'completed',
      legacy: true,
    });
    return;
  }

  store.enqueueDownload({
    ...media,
    url,
    headers,
    videoType: outputFileType,
    sourceType: getSourceType(url, fileType),
    downloadLocation,
    filePath: '',
    status: 'queued',
  });

  await scheduleQueuedDownloads();
};
