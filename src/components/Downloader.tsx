import React, {useEffect, useState} from 'react';
import {View, TouchableOpacity} from 'react-native';
import {ifExists} from '../lib/file/ifExists';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Octicons from '@expo/vector-icons/Octicons';
import {Stream} from '../lib/providers/types';
import Svg, {Circle, Path} from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import useContentStore from '../lib/zustand/contentStore';
import * as IntentLauncher from 'expo-intent-launcher';
import {cancelDownload} from '../lib/downloadManager';
import {downloadManager} from '../lib/downloader';
import DownloadBottomSheet from './DownloadBottomSheet';
import {settingsStorage} from '../lib/storage';
import {providerManager} from '../lib/services/ProviderManager';
import {deleteDownloadedFileByBaseName} from '../lib/downloadLocation';
import {deleteDownloadOutput} from '../lib/downloadDestination';
import {
  createDownloadDirectoryName,
  createDownloadSeasonDirectoryName,
} from '../lib/downloadId';
import useDownloadsStore, {
  CURRENT_DOWNLOAD_STATUSES,
} from '../lib/zustand/downloadsStore';
import {createSubtitleFileName} from '../lib/downloadId';
import {
  selectDownloadLocation,
  validateDownloadLocationAccess,
} from '../lib/downloadLocation';
import DownloadLocationDialog from './DownloadLocationDialog';
import {useM3Colors} from '../theme/M3PaletteContext';
import {LEGACY_TERTIARY_BACKGROUND} from '../theme/seeds';
import {showAppDialog} from '../lib/zustand/appDialogStore';

const DOWNLOAD_PROGRESS_SIZE = 42;
const DOWNLOAD_PROGRESS_RADIUS = 18;
const DOWNLOAD_PROGRESS_CENTER = DOWNLOAD_PROGRESS_SIZE / 2;

const createProgressPiePath = (progress: number) => {
  if (progress <= 0 || progress >= 1) {
    return undefined;
  }
  const endAngle = progress * Math.PI * 2 - Math.PI / 2;
  const endX =
    DOWNLOAD_PROGRESS_CENTER + DOWNLOAD_PROGRESS_RADIUS * Math.cos(endAngle);
  const endY =
    DOWNLOAD_PROGRESS_CENTER + DOWNLOAD_PROGRESS_RADIUS * Math.sin(endAngle);
  const largeArcFlag = progress > 0.5 ? 1 : 0;

  return [
    `M ${DOWNLOAD_PROGRESS_CENTER} ${DOWNLOAD_PROGRESS_CENTER}`,
    `L ${DOWNLOAD_PROGRESS_CENTER} ${
      DOWNLOAD_PROGRESS_CENTER - DOWNLOAD_PROGRESS_RADIUS
    }`,
    `A ${DOWNLOAD_PROGRESS_RADIUS} ${DOWNLOAD_PROGRESS_RADIUS} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
    'Z',
  ].join(' ');
};

const DownloadProgress = ({
  downloadedBytes,
  totalBytes,
  color,
}: {
  downloadedBytes: number;
  totalBytes: number;
  color: string;
}) => {
  const hasKnownTotal = totalBytes > 0;
  const progress = hasKnownTotal
    ? Math.min(1, Math.max(0, downloadedBytes / totalBytes))
    : 0;
  const progressPath = createProgressPiePath(progress);

  return (
    <View
      style={{
        alignItems: 'center',
        height: DOWNLOAD_PROGRESS_SIZE,
        justifyContent: 'center',
        width: DOWNLOAD_PROGRESS_SIZE,
      }}>
      <Svg
        height={DOWNLOAD_PROGRESS_SIZE}
        width={DOWNLOAD_PROGRESS_SIZE}
        style={{position: 'absolute'}}>
        <Circle
          cx={DOWNLOAD_PROGRESS_CENTER}
          cy={DOWNLOAD_PROGRESS_CENTER}
          r={DOWNLOAD_PROGRESS_RADIUS}
          fill="rgba(255,255,255,0.16)"
        />
        {progress >= 1 ? (
          <Circle
            cx={DOWNLOAD_PROGRESS_CENTER}
            cy={DOWNLOAD_PROGRESS_CENTER}
            r={DOWNLOAD_PROGRESS_RADIUS}
            fill={color}
          />
        ) : progressPath ? (
          <Path d={progressPath} fill={color} />
        ) : null}
      </Svg>
      {!hasKnownTotal ? (
        <MaterialIcons name="downloading" size={24} color={color} />
      ) : null}
    </View>
  );
};

type PendingDownload = {
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
  subtitles?: Array<{url: string; language: string; format?: string}>;
  deleteDownload: () => void;
};

const DownloadComponent = ({
  link,
  downloadId,
  fileName,
  type,
  mediaType,
  providerValue,
  title,
  showName,
  episodeName,
  seasonTitle,
  imdbId,
  poster,
  background,
  synopsis,
  infoUrl,
}: {
  link: string;
  downloadId: string;
  fileName: string;
  type: string;
  mediaType: 'movie' | 'series';
  providerValue: string;
  title: string;
  showName?: string;
  episodeName?: string;
  seasonTitle?: string;
  imdbId?: string;
  poster?: string;
  background?: string;
  synopsis?: string;
  infoUrl?: string;
}) => {
  const colors = useM3Colors();
  const primary = colors.primary;
  const provider = useContentStore(state => state.provider);
  const download = useDownloadsStore(
    state =>
      state.downloads[downloadId] ||
      Object.values(state.downloads).find(
        item => item.infoUrl === infoUrl && item.sourceLink === link,
      ),
  );
  const storedDownloadId = download?.id || downloadId;
  const removeDownload = useDownloadsStore(state => state.removeDownload);
  const [legacyDownloadedFile, setLegacyDownloadedFile] = useState<
    string | boolean
  >(false);
  const [downloadModal, setDownloadModal] = useState(false);
  const [longPressModal, setLongPressModal] = useState(false);
  const [servers, setServers] = useState<Stream[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingDownload, setPendingDownload] =
    useState<PendingDownload | null>(null);
  const [locationDialogVisible, setLocationDialogVisible] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState(false);
  const downloadActive = Boolean(
    download && CURRENT_DOWNLOAD_STATUSES.has(download.status),
  );
  const alreadyDownloaded =
    download?.status === 'completed' || Boolean(legacyDownloadedFile);

  const startDownloadWithLocation = async (request: PendingDownload) => {
    const currentLocation = settingsStorage.getDownloadLocationConfig();
    if (await validateDownloadLocationAccess(currentLocation)) {
      await downloadManager(request);
      return;
    }
    setPendingDownload(request);
    setLocationDialogVisible(true);
  };

  const selectLocationAndContinue = async () => {
    if (!pendingDownload || selectingLocation) {
      return;
    }
    setSelectingLocation(true);
    try {
      const location = await selectDownloadLocation();
      if (!location || !(await validateDownloadLocationAccess(location))) {
        return;
      }
      settingsStorage.setDownloadLocation(location);
      const request = pendingDownload;
      setPendingDownload(null);
      setLocationDialogVisible(false);
      await downloadManager(request);
    } finally {
      setSelectingLocation(false);
    }
  };

  useEffect(() => {
    if (download) {
      return;
    }
    const checkIfDownloaded = async () => {
      const exists = await ifExists(fileName);
      setLegacyDownloadedFile(exists);
    };
    checkIfDownloaded();
  }, [download, fileName]);

  // handle download deletion
  const deleteDownload = async () => {
    try {
      const deleted = download?.filePath
        ? await deleteDownloadOutput(download.filePath, {
            downloadLocation: download.downloadLocation,
            outputDirectoryNames: [
              createDownloadDirectoryName(download.showName || download.title),
              ...[createDownloadSeasonDirectoryName(download.seasonTitle)].filter(
                (name): name is string => Boolean(name),
              ),
            ],
          })
        : await deleteDownloadedFileByBaseName(
            settingsStorage.getDownloadLocationConfig(),
            fileName,
          );

      if (deleted) {
        removeDownload(storedDownloadId);
        setLegacyDownloadedFile(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // choose server
  useEffect(() => {
    const controller = new AbortController();
    if (!downloadModal && !longPressModal) {
      return;
    }
    const getServer = async () => {
      setServerLoading(true);
      setServerError(null);
      try {
        const availableServers = await providerManager.getStream({
          link,
          type,
          signal: controller.signal,
          providerValue: providerValue || provider.value,
        });
        const filteredServers = availableServers;
        // .filter(
        //   server =>
        //     !manifest[
        //       providerValue || provider.value
        //     ].nonDownloadableServer?.includes(server.server),
        // );
        setServers(filteredServers);
      } catch (error: any) {
        console.error('Error fetching servers:', error);
        const errorMessage = error?.message || 'Failed to fetch servers';
        setServerError(errorMessage);
        setServers([]);
      } finally {
        setServerLoading(false);
      }
    };
    getServer();

    return () => {
      controller.abort();
    };
  }, [downloadModal, longPressModal]);

  // on holdPress external downloader
  const longPressDownload = async (targetLink: string, targetType?: string) => {
    try {
      const isTorrent =
        targetType === 'torrent' || targetLink.startsWith('magnet:');
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: targetLink,
        type: isTorrent ? undefined : targetType || 'video/*',
      });
    } catch (error) {
      console.log(error);
    }
  };

  const showDeleteConfirmation = () => {
    showAppDialog({
      title: 'Delete download?',
      message: 'This removes the downloaded file from your device.',
      variant: 'warning',
      actions: [
        {label: 'Cancel'},
        {
          label: 'Delete',
          variant: 'destructive',
          onPress: deleteDownload,
        },
      ],
    });
  };

  const showCancelConfirmation = () => {
    showAppDialog({
      title: 'Cancel download?',
      message:
        'The current download will stop and its partial file will be removed.',
      variant: 'warning',
      actions: [
        {label: 'Keep downloading'},
        {
          label: 'Cancel download',
          variant: 'destructive',
          onPress: async () => {
            try {
              await cancelDownload(storedDownloadId);
            } catch (error) {
              console.log('Error cancelling download', error);
            }
          },
        },
      ],
    });
  };

  return (
    <>
      <View
        className="h-12 w-12 flex-row items-center justify-center rounded-full"
        style={{backgroundColor: LEGACY_TERTIARY_BACKGROUND}}>
        {downloadActive ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              download?.totalBytes
                ? `Download ${Math.round(
                    (download.downloadedBytes / download.totalBytes) * 100,
                  )} percent complete. Tap to cancel.`
                : 'Download in progress. Tap to cancel.'
            }
            onPress={showCancelConfirmation}
            className="h-12 w-12 items-center justify-center">
            <DownloadProgress
              downloadedBytes={download?.downloadedBytes ?? 0}
              totalBytes={download?.totalBytes ?? 0}
              color={primary}
            />
          </TouchableOpacity>
        ) : alreadyDownloaded ? (
          <TouchableOpacity
            onPress={showDeleteConfirmation}
            className="h-12 w-12 items-center justify-center">
            <MaterialIcons name="delete-outline" size={26} color={primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => {
              if (
                settingsStorage.getBool('alwaysExternalDownloader') === true
              ) {
                setLongPressModal(true);
              } else {
                setDownloadModal(true);
              }
            }}
            onLongPress={() => {
              if (settingsStorage.getBool('hapticFeedback') !== false) {
                ReactNativeHapticFeedback.trigger('effectHeavyClick', {
                  enableVibrateFallback: true,
                  ignoreAndroidSystemSettings: false,
                });
              }
              setLongPressModal(true);
            }}
            className="h-12 w-12 items-center justify-center">
            <Octicons name="download" size={24} color={primary} />
          </TouchableOpacity>
        )}
      </View>
      {/* download modal */}
      <DownloadBottomSheet
        setModal={setDownloadModal}
        showModal={downloadModal}
        data={servers}
        loading={serverLoading}
        error={serverError}
        title="Select Server To Download"
        onPressVideo={(server: Stream) => {
          startDownloadWithLocation({
            downloadId,
            title: title,
            showName,
            episodeName,
            seasonTitle,
            mediaType,
            imdbId,
            poster,
            background,
            synopsis,
            provider: providerValue || provider.value,
            infoUrl,
            sourceLink: link,
            url: server.link,
            fileName: fileName,
            fileType: server.type,
            headers: server?.headers,
            subtitles: server.subtitles?.map(subtitle => ({
              url: subtitle.uri,
              language: subtitle.language || 'Unknown',
              format: subtitle.type === 'text/vtt' ? 'vtt' : 'srt',
            })),
            deleteDownload: deleteDownload,
          });
        }}
        onPressSubs={(sub: {link: string; type: string; title: string}) => {
          startDownloadWithLocation({
            downloadId: `${downloadId}_subtitle_${sub.title}`,
            title: title + ' ' + sub.title + ' Subtitle ',
            showName,
            episodeName,
            seasonTitle,
            mediaType,
            imdbId,
            poster,
            background,
            synopsis,
            provider: providerValue || provider.value,
            infoUrl,
            sourceLink: link,
            url: sub.link,
            fileName: createSubtitleFileName(fileName, sub.title),
            fileType: sub.type,
            deleteDownload: () => {},
          });
        }}
      />
      <DownloadLocationDialog
        visible={locationDialogVisible}
        primary={primary}
        selecting={selectingLocation}
        onCancel={() => {
          if (selectingLocation) {
            return;
          }
          setPendingDownload(null);
          setLocationDialogVisible(false);
        }}
        onSelectFolder={() => {
          selectLocationAndContinue().catch(console.error);
        }}
      />
      {/* long press modal */}
      <DownloadBottomSheet
        setModal={setLongPressModal}
        showModal={longPressModal}
        data={servers}
        loading={serverLoading}
        error={serverError}
        title="Select Server To Open"
        onPressVideo={(server: Stream) => {
          longPressDownload(server.link);
        }}
        onPressSubs={(sub: {link: string; type: string; title: string}) => {
          longPressDownload(sub.link, 'text/vtt');
        }}
      />
    </>
  );
};

export default DownloadComponent;
