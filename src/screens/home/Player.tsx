import React, {useEffect, useState, useRef, useCallback, useMemo} from 'react';
import {
  AppState,
  AppStateStatus,
  BackHandler,
  ScrollView,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
  Platform,
  TouchableNativeFeedback,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import {cacheStorage, settingsStorage} from '../../lib/storage';
import {OrientationLocker, LANDSCAPE} from 'react-native-orientation-locker';
import VideoPlayer from '@8man/react-native-media-console';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  VideoRef,
  SelectedVideoTrack,
  SelectedVideoTrackType,
  ResizeMode,
  SelectedTrack,
  SelectedTrackType,
  BufferingStrategyType,
} from 'react-native-video';
import useContentStore from '../../lib/zustand/contentStore';
import {CastButton, useRemoteMediaClient} from 'react-native-google-cast';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import {FlashList} from '@shopify/flash-list';
import SearchSubtitles from '../../components/SearchSubtitles';
import {useStream, useVideoSettings} from '../../lib/hooks/useStream';
import {
  usePlayerProgress,
  usePlayerSettings,
} from '../../lib/hooks/usePlayerSettings';
import * as NavigationBar from 'expo-navigation-bar';
import {StatusBar} from 'react-native';
import {torrentManager} from '../../lib/torrentManager';
import {syncFromSharedFolder} from '../../lib/sync/syncService';
import {useM3Colors} from '../../theme/M3PaletteContext';
import useContinueWatchingStore from '../../lib/zustand/continueWatchingStore';
import useLocalVideoStore from '../../lib/zustand/localVideoStore';
import CastRemotePlayer from '../../components/CastRemotePlayer';
import {
  getEpisodeIdentity,
  getLocalVideoAssociationKey,
} from '../../lib/utils/episodeIdentity';
import {takePersistableUriPermission} from '../../lib/uriPermission';
import AnimatedHourglass from '../../components/AnimatedHourglass';
import PlayerMenuRow from '../../components/PlayerMenuRow';
import {extractImageAccent} from '../../lib/imageAccent';
import {mixHex} from '../../theme/seeds';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const readCachedProgress = (link?: string) => {
  if (!link) {
    return {position: 0, duration: 0};
  }
  try {
    const cached = cacheStorage.getString(link);
    if (!cached) {
      return {position: 0, duration: 0};
    }
    const parsed = JSON.parse(cached) as {
      position?: number;
      duration?: number;
    };
    return {
      position: parsed.position || 0,
      duration: parsed.duration || 0,
    };
  } catch {
    return {position: 0, duration: 0};
  }
};

const getResumePosition = (position: number, duration: number) => {
  if (!Number.isFinite(position) || position <= 5) {
    return 0;
  }

  // Completed episodes (including the 1/1 and legacy 10000/1 "watched"

  if (Number.isFinite(duration) && duration > 0 && position / duration > 0.85) {
    return 0;
  }

  return position;
};

const SHOW_FULLSCREEN_BUTTON = false;
const BOTTOM_CONTROL_ICON_COLOR = 'rgba(255,255,255,0.68)';
const BOTTOM_CONTROL_LABEL_STYLE = {
  color: BOTTOM_CONTROL_ICON_COLOR,
  fontWeight: '300' as const,
};

type QualityIconName = '8k' | '4k' | '2k' | 'hd' | 'sd' | 'video-settings';

const getQualityIconName = (
  height?: number | string,
  fallbackQuality?: string,
): QualityIconName => {
  const normalizedFallback = fallbackQuality?.trim().toLowerCase() || '';
  const parsedHeight =
    Number(height) || Number(normalizedFallback.match(/\d+/)?.[0]);

  if (parsedHeight >= 3000 || /(?:8k|4320)/.test(normalizedFallback)) {
    return '8k';
  }
  if (parsedHeight >= 1500 || /(?:4k|2160)/.test(normalizedFallback)) {
    return '4k';
  }
  if (parsedHeight >= 1200 || normalizedFallback.includes('1440')) {
    return '2k';
  }
  if (parsedHeight >= 500 || /(?:1080|720|\bhd\b)/.test(normalizedFallback)) {
    return 'hd';
  }
  if (
    parsedHeight > 0 ||
    /(?:480|360|240|144|\bsd\b)/.test(normalizedFallback)
  ) {
    return 'sd';
  }

  return 'video-settings';
};

const isCastableStreamUrl = (streamUrl: string, streamType?: string) => {
  if (!/^https?:\/\//i.test(streamUrl) || streamType === 'torrent') {
    return false;
  }

  try {
    const hostname = new URL(streamUrl).hostname.toLowerCase();
    return !['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname);
  } catch {
    return false;
  }
};

const getCastContentType = (streamUrl: string, streamType?: string) => {
  const normalizedType = streamType?.toLowerCase() || '';
  const normalizedUrl = streamUrl.toLowerCase().split('?')[0];

  if (normalizedType === 'm3u8' || normalizedUrl.endsWith('.m3u8')) {
    return 'application/vnd.apple.mpegurl';
  }
  if (normalizedType === 'dash' || normalizedUrl.endsWith('.mpd')) {
    return 'application/dash+xml';
  }
  if (normalizedType === 'webm' || normalizedUrl.endsWith('.webm')) {
    return 'video/webm';
  }
  if (normalizedType === 'mkv' || normalizedUrl.endsWith('.mkv')) {
    return 'video/x-matroska';
  }
  return 'video/mp4';
};

const goFullScreen = () => {
  if (Platform.OS === 'android') {
    // Sticky-immersive behavior is handled by the system under edge-to-edge;
    NavigationBar.setVisibilityAsync('hidden');
    StatusBar.setHidden(true, 'slide');
  }
};

const exitFullScreen = () => {
  if (Platform.OS === 'android') {
    // Show the navigation bar
    NavigationBar.setVisibilityAsync('visible');
    StatusBar.setHidden(false, 'slide');
  }
};

const applyFullscreenMode = (isFullScreenEnabled: boolean) => {
  if (isFullScreenEnabled) {
    goFullScreen();
    return;
  }

  exitFullScreen();
};

const reapplyFullscreenMode = (isFullScreenEnabled: boolean) => {
  applyFullscreenMode(isFullScreenEnabled);

  if (Platform.OS === 'android' && isFullScreenEnabled) {
    setTimeout(() => {
      applyFullscreenMode(true);
    }, 150);
  }
};

const Player = ({route}: Props): React.JSX.Element => {
  const [syncReady, setSyncReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    syncFromSharedFolder()
      .catch(error => console.warn('[AirflixSync] Player sync failed:', error))
      .finally(() => {
        if (mounted) {
          setSyncReady(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const colors = useM3Colors();
  const primary = colors.primary;
  const dynamicInfoAccentEnabled = settingsStorage.isDynamicInfoAccentEnabled();
  const hourglassArtwork =
    route.params?.poster?.poster || route.params?.poster?.background;
  const [hourglassSandColor, setHourglassSandColor] = useState(primary);

  useEffect(() => {
    let active = true;
    if (!dynamicInfoAccentEnabled || !hourglassArtwork) {
      setHourglassSandColor(primary);
      return () => {
        active = false;
      };
    }

    extractImageAccent(
      hourglassArtwork,
      `detail-poster-accent-v1:${hourglassArtwork}`,
    ).then(accent => {
      if (active) {
        setHourglassSandColor(
          accent ? mixHex(accent, '#FFFFFF', 0.72) : primary,
        );
      }
    });

    return () => {
      active = false;
    };
  }, [dynamicInfoAccentEnabled, hourglassArtwork, primary]);
  const {provider} = useContentStore();
  const navigation = useNavigation();
  const upsertContinueWatching = useContinueWatchingStore(
    state => state.upsertItem,
  );
  const updateContinueWatchingProgress = useContinueWatchingStore(
    state => state.updateProgress,
  );
  const continueWatchingItems = useContinueWatchingStore(state => state.items);
  const localVideoAssociations = useLocalVideoStore(
    state => state.associations,
  );
  const setLocalVideoAssociation = useLocalVideoStore(
    state => state.setLocalVideo,
  );
  const clearLocalVideoAssociation = useLocalVideoStore(
    state => state.clearLocalVideo,
  );

  // Player ref
  const playerRef = useRef<VideoRef>(null as unknown as VideoRef);
  const remoteMediaClient = useRemoteMediaClient();
  const hasSetInitialTracksRef = useRef(false);
  const videoLoadedRef = useRef(false);
  const resumeAppliedRef = useRef(false);
  const loadedCastMediaRef = useRef('');
  const remoteCastPositionRef = useRef(0);
  const wasCastingRef = useRef(false);
  const appliedPersistedLocalVideoRef = useRef(false);

  // Shared values for animations
  const loadingOpacity = useSharedValue(0);
  const loadingScale = useSharedValue(0.8);
  const lockButtonTranslateY = useSharedValue(-150);
  const lockButtonOpacity = useSharedValue(0);
  const textVisibility = useSharedValue(0);
  const speedIconOpacity = useSharedValue(1);
  const controlsTranslateY = useSharedValue(150);
  const controlsOpacity = useSharedValue(0);
  const toastOpacity = useSharedValue(0);
  const settingsTranslateY = useSharedValue(10000);
  const settingsOpacity = useSharedValue(0);

  // Animated styles
  const loadingContainerStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
    transform: [{scale: loadingScale.value}],
  }));

  const lockButtonStyle = useAnimatedStyle(() => ({
    transform: [{translateY: lockButtonTranslateY.value}],
    opacity: lockButtonOpacity.value,
  }));

  const controlsStyle = useAnimatedStyle(() => ({
    transform: [{translateY: controlsTranslateY.value}],
    opacity: controlsOpacity.value,
  }));

  const controlsOpacityStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
  }));

  const settingsStyle = useAnimatedStyle(() => ({
    transform: [{translateY: settingsTranslateY.value}],

    opacity: settingsOpacity.value,
  }));

  // Active episode state
  const [activeEpisode, setActiveEpisode] = useState(
    route.params?.episodeList?.[route.params.linkIndex],
  );

  // Search subtitles state
  const [searchQuery, setSearchQuery] = useState('');

  // Custom hooks for stream management
  const {
    streamData,
    selectedStream,
    setSelectedStream,
    externalSubs,
    setExternalSubs,
    isLoading: streamLoading,
    error: streamError,
    switchToNextStream,
  } = useStream({
    activeEpisode,
    routeParams: route.params,
    provider: provider.value,
  });

  // Custom hooks for video settings
  const {
    audioTracks,
    textTracks,
    videoTracks,
    selectedAudioTrackIndex,
    selectedTextTrackIndex,
    selectedQualityIndex,
    setSelectedAudioTrackIndex,
    setSelectedTextTrackIndex,
    setSelectedQualityIndex,
    setTextTracks,
    processAudioTracks,
    processVideoTracks,
    handleVideoLoad,
    resetVideoTracks,
  } = useVideoSettings();

  // Custom hooks for player settings
  const {
    showControls,
    setShowControls,
    showSettings,
    setShowSettings,
    activeTab,
    setActiveTab,
    resizeMode,
    playbackRate,
    setPlaybackRate,
    isPlayerLocked,
    showUnlockButton,
    toastMessage,
    showToast,
    setToast,
    isTextVisible,
    isFullScreen,
    // setIsFullScreen,
    handleResizeMode,
    togglePlayerLock,
    toggleFullScreen,
    handleLockedScreenTap,
    unlockButtonTimerRef,
  } = usePlayerSettings();
  const isFullScreenRef = useRef(isFullScreen);
  const continueWatchingId = route.params.infoUrl || activeEpisode?.link;
  const activeEpisodeKey = useMemo(
    () =>
      getLocalVideoAssociationKey({
        episode: activeEpisode,
        provider: route.params.providerValue || provider.value,
        infoUrl: continueWatchingId,
      }),
    [
      activeEpisode,
      continueWatchingId,
      provider.value,
      route.params.providerValue,
    ],
  );
  const localVideoForEpisode = activeEpisodeKey
    ? localVideoAssociations[activeEpisodeKey]
    : undefined;
  const syncedContinueWatching = useMemo(
    () => continueWatchingItems.find(item => item.id === continueWatchingId),
    [continueWatchingId, continueWatchingItems],
  );
  const syncedEpisodeMatches =
    Boolean(syncedContinueWatching) &&
    getEpisodeIdentity(syncedContinueWatching?.episode) ===
      getEpisodeIdentity(activeEpisode);
  const syncedPosition = syncedEpisodeMatches
    ? syncedContinueWatching?.position || 0
    : 0;
  const syncedDuration = syncedEpisodeMatches
    ? syncedContinueWatching?.duration || 0
    : 0;
  const syncedUpdatedAt = syncedEpisodeMatches
    ? syncedContinueWatching?.updatedAt || 0
    : 0;

  useEffect(() => {
    if (
      !syncReady ||
      !continueWatchingId ||
      !route.params.infoUrl ||
      !route.params.primaryTitle ||
      !route.params.providerValue ||
      !activeEpisode?.link
    ) {
      return;
    }
    const cachedProgress = readCachedProgress(activeEpisode.link);
    const position = syncedEpisodeMatches
      ? syncedPosition
      : cachedProgress.position;
    const duration = syncedEpisodeMatches
      ? syncedDuration
      : cachedProgress.duration;
    upsertContinueWatching({
      id: continueWatchingId,
      title: route.params.primaryTitle,
      episodeTitle: activeEpisode.title || route.params.secondaryTitle,
      episode: activeEpisode,
      type: route.params.type,
      poster: route.params.poster?.poster,
      background: route.params.poster?.background,
      providerValue: route.params.providerValue,
      infoUrl: route.params.infoUrl,
      position,
      duration,
      updatedAt: syncedUpdatedAt || (position > 0 ? Date.now() : 0),
    });
  }, [
    activeEpisode,
    continueWatchingId,
    route.params.infoUrl,
    route.params.poster?.background,
    route.params.poster?.poster,
    route.params.primaryTitle,
    route.params.providerValue,
    route.params.secondaryTitle,
    route.params.type,
    syncReady,
    syncedDuration,
    syncedEpisodeMatches,
    syncedPosition,
    syncedUpdatedAt,
    upsertContinueWatching,
  ]);

  const saveContinueWatchingProgress = useCallback(
    (position: number, duration: number) => {
      if (continueWatchingId) {
        updateContinueWatchingProgress(continueWatchingId, position, duration);
      }
    },
    [continueWatchingId, updateContinueWatchingProgress],
  );

  // Custom hook for progress handling
  const {videoPositionRef, handleProgress} = usePlayerProgress({
    activeEpisode,
    onProgressSaved: saveContinueWatchingProgress,
  });

  // Memoized values
  const playbacks = useMemo(
    () => [0.25, 0.5, 1.0, 1.25, 1.35, 1.5, 1.75, 2],
    [],
  );
  const hideSeekButtons = useMemo(
    () => settingsStorage.hideSeekButtons() || false,
    [],
  );

  const enableSwipeGesture = useMemo(
    () => settingsStorage.isSwipeGestureEnabled(),
    [],
  );
  const showMediaControls = useMemo(
    () => settingsStorage.showMediaControls(),
    [],
  );

  // Memoized watched duration
  const watchedDuration = useMemo(() => {
    if (syncedEpisodeMatches) {
      return getResumePosition(syncedPosition, syncedDuration);
    }
    const cachedProgress = readCachedProgress(activeEpisode?.link);
    return getResumePosition(cachedProgress.position, cachedProgress.duration);
  }, [
    activeEpisode?.link,
    syncedDuration,
    syncedEpisodeMatches,
    syncedPosition,
  ]);

  useEffect(() => {
    resumeAppliedRef.current = false;
    videoLoadedRef.current = false;
    appliedPersistedLocalVideoRef.current = false;
  }, [activeEpisode?.id, activeEpisode?.link, activeEpisode?.sourceLink]);

  // Auto-resume a remembered local video file for this episode (e.g. when
  // opening this title again from Continue Watching) instead of forcing the
  // user to pick the file again. Only applied once per episode so it never
  // fights a manual server switch made later in the same session. Looked up
  // directly by the current episode's identity, so it can never carry over
  // a different episode's file.
  useEffect(() => {
    if (appliedPersistedLocalVideoRef.current) {
      return;
    }
    if (!localVideoForEpisode?.uri) {
      return;
    }
    appliedPersistedLocalVideoRef.current = true;
    setSelectedStream({
      server: 'Local Video',
      link: localVideoForEpisode.uri,
      type: 'local',
    });
  }, [localVideoForEpisode, setSelectedStream]);

  useEffect(() => {
    if (
      videoLoadedRef.current &&
      !resumeAppliedRef.current &&
      watchedDuration > 5 &&
      videoPositionRef.current.position < 5
    ) {
      playerRef.current?.seek(watchedDuration);
      resumeAppliedRef.current = true;
    }
  }, [videoPositionRef, watchedDuration]);

  // Memoized selected tracks
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<SelectedTrack>({
    type: SelectedTrackType.INDEX,
    value: 0,
  });

  const [selectedTextTrack, setSelectedTextTrack] = useState<SelectedTrack>({
    type: SelectedTrackType.DISABLED,
  });

  const [selectedVideoTrack, setSelectedVideoTrack] =
    useState<SelectedVideoTrack>({
      type: SelectedVideoTrackType.AUTO,
    });

  const [processedStreamUrl, setProcessedStreamUrl] = useState<string>('');
  const canCastStream = useMemo(
    () =>
      !Platform.isTV &&
      isCastableStreamUrl(processedStreamUrl, selectedStream?.type),
    [processedStreamUrl, selectedStream?.type],
  );
  const isCasting = Boolean(remoteMediaClient);
  const [isResolvingStream, setIsResolvingStream] = useState(false);
  const progressIntervalRef = useRef<any>(null);
  const [torrentState, setTorrentState] = useState<string>('');
  const [torrentDownloaded, setTorrentDownloaded] = useState<number>(0);
  const [torrentDownloadSpeed, setTorrentDownloadSpeed] = useState<number>(0);
  const findVideoFileIndex = async (infoHash: string): Promise<number> => {
    const files = await torrentManager.getFiles(infoHash);
    if (!files || files.length === 0) {
      throw new Error('No files found in torrent');
    }

    const videoExts = [
      '.mp4',
      '.mkv',
      '.avi',
      '.webm',
      '.mov',
      '.ts',
      '.flv',
      '.wmv',
      '.m4v',
    ];
    let bestIndex = 0;
    let bestSize = 0;
    for (const f of files) {
      const name = f.name.toLowerCase();
      if (videoExts.some(ext => name.endsWith(ext)) && f.size > bestSize) {
        bestIndex = f.index;
        bestSize = f.size;
      }
    }
    return bestIndex;
  };

  const activeTorrentRef = useRef<string | null>(null);

  // Handle torrent proxy resolution
  useEffect(() => {
    let isMounted = true;

    const cleanupPreviousTorrent = async () => {
      const prevHash = activeTorrentRef.current;
      if (prevHash) {
        activeTorrentRef.current = null;
        try {
          await torrentManager.deleteTorrent(prevHash, true);
        } catch {}
      }
    };

    const resolveStream = async () => {
      if (!selectedStream?.link) {
        setProcessedStreamUrl('');
        setIsResolvingStream(false);
        return;
      }

      setProcessedStreamUrl('');
      setIsResolvingStream(true);

      const isTorrent =
        selectedStream.type === 'torrent' ||
        selectedStream.link.startsWith('magnet:');
      if (isTorrent) {
        try {
          if (
            !selectedStream.link ||
            selectedStream.link.includes(
              'd41d0cfbf8baa3ce04a7074b0c486243dd5fbd00',
            ) ||
            selectedStream.link.includes('d41d8cd98f00b204e9800998ecf8427e')
          ) {
            console.warn(
              'Ignoring empty or dummy torrent hash:',
              selectedStream.link,
            );
            switchToNextStream();
            return;
          }
          console.log('Adding torrent link:', selectedStream.link);
          setTorrentState('Fetching Metadata...');
          setTorrentDownloaded(0);
          setTorrentDownloadSpeed(0);
          const addData = await torrentManager.addTorrent(selectedStream.link);
          const infoHash = addData.infoHash;
          if (!isMounted) {
            torrentManager.deleteTorrent(infoHash, true).catch(() => {});
            return;
          }
          activeTorrentRef.current = infoHash;

          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          if (isMounted) {
            progressIntervalRef.current = setInterval(async () => {
              try {
                const stats = await torrentManager.getStats(infoHash);
                if (isMounted) {
                  setTorrentState(stats.state || '');
                  setTorrentDownloaded((stats.totalDone || 0) / 1024 / 1024);
                  setTorrentDownloadSpeed(stats.downloadRate || 0);
                }
              } catch {}
            }, 1000);
          }

          if (isMounted) {
            const videoFileIndex = await findVideoFileIndex(infoHash);
            const preparation = torrentManager.prepareVideoFile(
              infoHash,
              videoFileIndex,
            );
            const streamUrl = await torrentManager.getStreamUrl(
              infoHash,
              videoFileIndex,
            );
            console.log('Torrent stream URL:', streamUrl);
            setProcessedStreamUrl(streamUrl);
            setIsResolvingStream(false);
            await preparation;
          }
        } catch (error) {
          console.error('Failed to start torrent stream:', error);
          if (isMounted) {
            setIsResolvingStream(false);
            if (!switchToNextStream()) {
              ToastAndroid.show('Failed to load torrent', ToastAndroid.SHORT);
            }
          }
        }
      } else {
        setProcessedStreamUrl(selectedStream.link);
        setIsResolvingStream(false);
      }
    };

    cleanupPreviousTorrent().then(() => resolveStream());

    return () => {
      isMounted = false;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      const hash = activeTorrentRef.current;
      if (hash) {
        activeTorrentRef.current = null;
        try {
          torrentManager.deleteTorrent(hash, true);
        } catch (e) {
          console.warn('Failed to delete active torrent on unmount', e);
        }
      }
    };
  }, [selectedStream]);

  // Memoized format quality function
  const formatQuality = useCallback((quality: string) => {
    if (quality === 'auto') {
      return quality;
    }
    const num = Number(quality);
    if (num > 1080) {
      return '4K';
    }
    if (num > 720) {
      return '1080p';
    }
    if (num > 480) {
      return '720p';
    }
    if (num > 360) {
      return '480p';
    }
    if (num > 240) {
      return '360p';
    }
    if (num > 144) {
      return '240p';
    }
    return quality;
  }, []);

  const selectedPlayerQuality = useMemo(() => {
    const selectedTrack =
      videoTracks?.length === 1
        ? videoTracks[0]
        : videoTracks?.[selectedQualityIndex];
    const selectedTrackHeight = Number(selectedTrack?.height) || 0;
    const quality =
      (selectedTrackHeight > 0 ? selectedTrackHeight.toString() : undefined) ||
      selectedStream?.quality ||
      'auto';

    if (selectedStream?.type === 'local') {
      return {icon: 'video-settings' as const, label: 'Local'};
    }

    return {
      icon: getQualityIconName(selectedTrackHeight, selectedStream?.quality),
      label: formatQuality(quality),
    };
  }, [
    formatQuality,
    selectedQualityIndex,
    selectedStream?.quality,
    selectedStream?.type,
    videoTracks,
  ]);

  // Memoized next episode handler
  const handleNextEpisode = useCallback(() => {
    const currentIndex = route.params?.episodeList?.indexOf(activeEpisode);
    if (
      currentIndex !== undefined &&
      currentIndex < route.params?.episodeList?.length - 1
    ) {
      setActiveEpisode(route.params?.episodeList[currentIndex + 1]);
      hasSetInitialTracksRef.current = false;
    } else {
      ToastAndroid.show('No more episodes', ToastAndroid.SHORT);
    }
  }, [activeEpisode, route.params?.episodeList]);

  // Memoized error handler
  const handleVideoError = useCallback(
    (e: any) => {
      console.log('PlayerError', e);

      if (selectedStream?.type === 'local') {
        // The remembered local file is unreadable — most likely it was
        // deleted, moved, or its access permission was revoked. Forget it
        // and fall back to normal online sources instead of exiting the
        // player. This usually fires before the background online search
        // has finished, so: if results are already in, jump straight to
        // the first one; otherwise clear the selection back to neutral so
        // the existing "pick streamData[0] once it arrives" logic in
        // useStream takes over as soon as it resolves.
        if (activeEpisodeKey) {
          clearLocalVideoAssociation(activeEpisodeKey);
        }
        appliedPersistedLocalVideoRef.current = true;
        ToastAndroid.show(
          'Local video not found. Trying online sources...',
          ToastAndroid.SHORT,
        );
        setSelectedStream(
          streamData && streamData.length > 0
            ? streamData[0]
            : {server: '', link: '', type: ''},
        );
        setShowControls(true);
        return;
      }

      if (!switchToNextStream()) {
        ToastAndroid.show(
          'Video could not be played, try again later',
          ToastAndroid.SHORT,
        );
        navigation.goBack();
      }
      setShowControls(true);
    },
    [
      activeEpisodeKey,
      clearLocalVideoAssociation,
      navigation,
      selectedStream,
      setSelectedStream,
      setShowControls,
      streamData,
      switchToNextStream,
    ],
  );

  // Let the user pick a local video file from the device and play it
  // instead of the online stream. Reuses the same DocumentPicker flow
  // used for custom subtitle files below, and simply swaps the active
  // "stream" for one pointing at the local file uri. Continue Watching
  // keeps working because it is keyed off the episode/infoUrl, not the
  // stream source, and casting is automatically disabled for local files
  // since isCastableStreamUrl only allows http(s) links.
  const handleSelectLocalVideo = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'video/*',
          'video/mp4',
          'video/x-matroska',
          'video/quicktime',
          'video/x-msvideo',
          'video/webm',
          'video/x-m4v',
        ],
        multiple: false,
        // Videos can be several gigabytes. Play the provider uri directly
        // instead of duplicating the whole file into app cache — Android's
        // takePersistableUriPermission (below) keeps it readable across
        // app restarts without a copy.
        copyToCacheDirectory: false,
      });

      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        setSelectedStream({
          server: 'Local Video',
          link: asset.uri,
          type: 'local',
        });
        setShowSettings(false);
        // Remember this file against the current episode so reopening it
        // later (e.g. from Continue Watching) resumes it automatically
        // instead of prompting the picker again.
        appliedPersistedLocalVideoRef.current = true;
        if (activeEpisodeKey) {
          setLocalVideoAssociation(
            activeEpisodeKey,
            asset.uri,
            asset.name || undefined,
            continueWatchingId,
          );
        }

        const persisted = await takePersistableUriPermission(asset.uri);

        ToastAndroid.show(
          persisted
            ? `Playing local file: ${asset.name || 'video'}`
            : `Playing local file: ${asset.name || 'video'} (may need to be re-selected after closing the app)`,
          ToastAndroid.LONG,
        );
      }
    } catch (err) {
      console.log(err);
      ToastAndroid.show('Could not open the selected file', ToastAndroid.SHORT);
    }
  }, [
    activeEpisodeKey,
    continueWatchingId,
    setLocalVideoAssociation,
    setSelectedStream,
    setShowSettings,
  ]);

  useEffect(() => {
    if (!remoteMediaClient) {
      return;
    }

    const subscription = remoteMediaClient.onMediaProgressUpdated(
      (progress, duration) => {
        remoteCastPositionRef.current = progress;
        if (duration > 0) {
          handleProgress({currentTime: progress, seekableDuration: duration});
        }
      },
      1,
    );

    return () => subscription.remove();
  }, [handleProgress, remoteMediaClient]);

  useEffect(() => {
    if (remoteMediaClient) {
      wasCastingRef.current = true;
      return;
    }

    if (!wasCastingRef.current) {
      return;
    }

    wasCastingRef.current = false;
    loadedCastMediaRef.current = '';
    const resumePosition = remoteCastPositionRef.current;
    if (resumePosition > 0) {
      playerRef.current?.seek(resumePosition);
    }
    playerRef.current?.resume();
  }, [remoteMediaClient]);

  useEffect(() => {
    if (!remoteMediaClient || !canCastStream || !processedStreamUrl) {
      return;
    }

    const mediaKey = `${getEpisodeIdentity(activeEpisode)}:${processedStreamUrl}`;
    if (loadedCastMediaRef.current === mediaKey) {
      return;
    }

    let cancelled = false;
    const loadCastMedia = async () => {
      const castSubtitleTracks = externalSubs.flatMap((track, index) => {
        const uri = track?.uri as string | undefined;
        const type = String(track?.type || '').toLowerCase();
        if (!uri || !/^https?:\/\//i.test(uri)) {
          return [];
        }

        const contentType = type.includes('ttml')
          ? 'application/ttml+xml'
          : type.includes('vtt') || uri.toLowerCase().includes('.vtt')
            ? 'text/vtt'
            : null;
        if (!contentType) {
          return [];
        }

        return [
          {
            id: index + 1,
            type: 'text' as const,
            subtype: 'subtitles' as const,
            contentId: uri,
            contentType,
            language: track?.language || 'und',
            name: track?.title || track?.language || `Subtitle ${index + 1}`,
          },
        ];
      });

      try {
        await remoteMediaClient.loadMedia({
          autoplay: true,
          playbackRate,
          startTime: Math.max(
            remoteCastPositionRef.current,
            videoPositionRef.current.position,
            watchedDuration,
          ),
          mediaInfo: {
            contentUrl: processedStreamUrl,
            contentType: getCastContentType(
              processedStreamUrl,
              selectedStream?.type,
            ),
            mediaTracks: castSubtitleTracks,
            metadata: {
              type: 'generic',
              title: route.params?.primaryTitle,
              subtitle: activeEpisode?.title || route.params?.secondaryTitle,
              images: route.params?.poster?.poster
                ? [{url: route.params.poster.poster}]
                : undefined,
            },
            customData: selectedStream?.headers
              ? {headers: selectedStream.headers}
              : undefined,
          },
        });

        if (!cancelled) {
          loadedCastMediaRef.current = mediaKey;
          wasCastingRef.current = true;
          playerRef.current?.pause();
          setToast('Playing on Cast device', 2000);
        }
      } catch (error) {
        console.warn('Failed to load media on Cast device:', error);
        if (!cancelled) {
          loadedCastMediaRef.current = '';
          setToast('This stream could not be played on the Cast device', 3000);
        }
      }
    };

    loadCastMedia();
    return () => {
      cancelled = true;
    };
  }, [
    activeEpisode,
    canCastStream,
    externalSubs,
    playbackRate,
    processedStreamUrl,
    remoteMediaClient,
    route.params?.poster?.poster,
    route.params?.primaryTitle,
    route.params?.secondaryTitle,
    selectedStream?.headers,
    selectedStream?.type,
    setToast,
    videoPositionRef,
    watchedDuration,
  ]);

  // Exit fullscreen on back
  useFocusEffect(
    useCallback(() => {
      // This code now runs every time the screen is focused
      reapplyFullscreenMode(isFullScreenRef.current);

      return () => {
        exitFullScreen();
      };
    }, []),
  );

  useEffect(() => {
    isFullScreenRef.current = isFullScreen;
  }, [isFullScreen]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          reapplyFullscreenMode(isFullScreenRef.current);
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [isFullScreen]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        exitFullScreen();
        navigation.goBack();
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [navigation]);

  // Reset track selections when stream changes
  useEffect(() => {
    setSelectedAudioTrackIndex(0);
    setSelectedTextTrackIndex(1000);
    setSelectedQualityIndex(1000);
    resetVideoTracks();
  }, [
    selectedStream,
    setSelectedAudioTrackIndex,
    setSelectedTextTrackIndex,
    setSelectedQualityIndex,
    resetVideoTracks,
  ]);

  // Initialize search query
  useEffect(() => {
    setSearchQuery(route.params?.primaryTitle || '');
  }, [route.params?.primaryTitle]);

  // Set last selected audio and subtitle tracks
  useEffect(() => {
    if (hasSetInitialTracksRef.current) {
      return;
    }

    const lastAudioTrack = cacheStorage.getString('lastAudioTrack') || 'auto';
    const lastTextTrack = cacheStorage.getString('lastTextTrack') || 'auto';

    const audioTrackIndex = audioTracks.findIndex(
      track => track.language === lastAudioTrack,
    );
    const textTrackIndex = textTracks.findIndex(
      track => track.language === lastTextTrack,
    );

    if (audioTrackIndex !== -1) {
      setSelectedAudioTrack({
        type: SelectedTrackType.INDEX,
        value: audioTrackIndex,
      });
      setSelectedAudioTrackIndex(audioTrackIndex);
    }

    if (textTrackIndex !== -1) {
      setSelectedTextTrack({
        type: SelectedTrackType.INDEX,
        value: textTrackIndex,
      });
      setSelectedTextTrackIndex(textTrackIndex);
    }

    if (audioTracks.length > 0 && textTracks.length > 0) {
      hasSetInitialTracksRef.current = true;
    }
  }, [
    textTracks,
    audioTracks,
    setSelectedAudioTrackIndex,
    setSelectedTextTrackIndex,
  ]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (unlockButtonTimerRef.current) {
        clearTimeout(unlockButtonTimerRef.current);
      }
    };
  }, [unlockButtonTimerRef]);

  // Animation effects
  useEffect(() => {
    // Loading animations
    if (streamLoading || isResolvingStream) {
      loadingOpacity.value = withTiming(1, {duration: 800});
      loadingScale.value = withTiming(1, {duration: 800});
    }
  }, [isResolvingStream, streamLoading]);

  useEffect(() => {
    // Lock button animations
    const shouldShow =
      (isPlayerLocked && showUnlockButton) || (!isPlayerLocked && showControls);
    lockButtonTranslateY.value = withTiming(shouldShow ? 0 : -150, {
      duration: 250,
    });
    lockButtonOpacity.value = withTiming(shouldShow ? 1 : 0, {
      duration: 250,
    });
  }, [isPlayerLocked, showUnlockButton, showControls]);

  useEffect(() => {
    // 2x speed text visibility
    textVisibility.value = withTiming(isTextVisible ? 1 : 0, {duration: 250});

    // Speed icon blinking animation
    if (isTextVisible) {
      speedIconOpacity.value = withRepeat(
        withSequence(
          withTiming(1, {duration: 250}),
          withTiming(0, {duration: 150}),
          withTiming(1, {duration: 150}),
        ),
        -1,
      );
    } else {
      speedIconOpacity.value = withTiming(1, {duration: 150});
    }
  }, [isTextVisible]);

  useEffect(() => {
    // Controls visibility
    controlsTranslateY.value = withTiming(showControls ? 0 : 150, {
      duration: 250,
    });
    controlsOpacity.value = withTiming(showControls ? 1 : 0, {
      duration: 250,
    });
  }, [showControls]);

  useEffect(() => {
    // Toast visibility
    toastOpacity.value = withTiming(showToast ? 1 : 0, {duration: 250});
  }, [showToast]);

  useEffect(() => {
    // Settings modal visibility
    settingsTranslateY.value = withTiming(showSettings ? 0 : 5000, {
      duration: 250,
    });
    settingsOpacity.value = withTiming(showSettings ? 1 : 0, {
      duration: 250,
    });
  }, [showSettings]);

  useEffect(() => {
    // Handle fullscreen toggle
    reapplyFullscreenMode(isFullScreen);
  }, [isFullScreen]);

  // Memoized video player props
  const videoPlayerProps = useMemo(
    () => ({
      disableGesture: isPlayerLocked || !enableSwipeGesture,
      doubleTapTime: 200,
      disableSeekButtons: isPlayerLocked || hideSeekButtons,
      showOnStart: !isPlayerLocked,
      source: {
        textTracks: externalSubs,
        uri: processedStreamUrl || '',
        bufferConfig: {
          // High-bitrate 4K streams can otherwise fill Android's complete
          // Java heap: react-native-video defaults the allocator limit to
          // 100%, then the codec has no room left for output buffers.
          minBufferMs: 8000,
          maxBufferMs: 20000,
          bufferForPlaybackMs: 1500,
          bufferForPlaybackAfterRebufferMs: 3000,
          backBufferDurationMs: 0,
          maxHeapAllocationPercent: 0.18,
          minBufferMemoryReservePercent: 0.2,
          minBackBufferMemoryReservePercent: 0.25,
          cacheSizeMB: 0,
        },
        shouldCache: true,
        ...(selectedStream?.type === 'm3u8' && {type: 'm3u8'}),
        headers: selectedStream?.headers,
        metadata: {
          title: route.params?.primaryTitle,
          subtitle: activeEpisode?.title,
          artist: activeEpisode?.title,
          description: activeEpisode?.title,
          imageUri: route.params?.poster?.poster,
        },
      },
      onProgress: handleProgress,
      onLoad: (e: any) => {
        handleVideoLoad(e?.naturalSize);
        videoLoadedRef.current = true;
        if (watchedDuration > 5) {
          playerRef.current?.seek(watchedDuration);
          resumeAppliedRef.current = true;
        }
        playerRef?.current?.resume();
        setPlaybackRate(1.0);
      },
      videoRef: playerRef,
      rate: playbackRate,
      subtitleStyle: {
        fontSize: settingsStorage.getSubtitleFontSize() || 16,
        opacity: settingsStorage.getSubtitleOpacity() || 1,
        paddingBottom: settingsStorage.getSubtitleBottomPadding() || 10,
        subtitlesFollowVideo: false,
      },
      title: {
        primary:
          route.params?.primaryTitle && route.params?.primaryTitle?.length > 70
            ? route.params?.primaryTitle.slice(0, 70) + '...'
            : route.params?.primaryTitle || '',
        secondary: activeEpisode?.title,
      },
      navigator: navigation,
      seekColor: primary,
      showDuration: true,
      toggleResizeModeOnFullscreen: false,
      fullscreenOrientation: 'landscape' as const,
      fullscreenAutorotate: true,
      onShowControls: () => setShowControls(true),
      onHideControls: () => setShowControls(false),
      rewindTime: 10,
      isFullscreen: true,
      disableFullscreen: true,
      disableVolume: true,
      showHours: true,
      progressUpdateInterval: 1000,
      bufferingStrategy: BufferingStrategyType.DEPENDING_ON_MEMORY,
      showNotificationControls: showMediaControls,
      onError: handleVideoError,
      resizeMode,
      selectedAudioTrack,
      onAudioTracks: (e: any) => processAudioTracks(e.audioTracks),
      selectedTextTrack,
      onTextTracks: (e: any) => setTextTracks(e.textTracks),
      onVideoTracks: (e: any) => processVideoTracks(e.videoTracks),
      selectedVideoTrack,
      style: {flex: 1, zIndex: 100},
      controlAnimationTiming: 357,
      controlTimeoutDelay: 10000,
      hideAllControlls: isPlayerLocked,
      onSeekSnap: () => {
        if (settingsStorage.isHapticFeedbackEnabled()) {
          ReactNativeHapticFeedback.trigger('effectTick', {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false,
          });
        }
      },
    }),
    [
      isPlayerLocked,
      enableSwipeGesture,
      hideSeekButtons,
      externalSubs,
      selectedStream,
      route.params,
      activeEpisode,
      handleProgress,
      watchedDuration,
      playbackRate,
      setPlaybackRate,
      primary,
      navigation,
      setShowControls,
      showMediaControls,
      handleVideoError,
      resizeMode,
      selectedAudioTrack,
      selectedTextTrack,
      selectedVideoTrack,
      processAudioTracks,
      processVideoTracks,
      handleVideoLoad,
      processedStreamUrl,
    ],
  );

  // Show loading state
  if (streamLoading && !isCasting && selectedStream?.type !== 'local') {
    return (
      <SafeAreaView
        edges={{right: 'off', top: 'off', left: 'off', bottom: 'off'}}
        className="bg-black flex-1 justify-center items-center">
        <StatusBar translucent={true} hidden={true} />
        <OrientationLocker orientation={LANDSCAPE} />
        {/* create ripple effect */}
        <TouchableNativeFeedback
          background={TouchableNativeFeedback.Ripple(
            'rgba(255,255,255,0.15)',
            false, // ripple shows at tap location
          )}>
          <View className="w-full h-full justify-center items-center">
            <Animated.View
              style={[loadingContainerStyle]}
              className="justify-center items-center">
              <View className="mb-2">
                <AnimatedHourglass sandColor={hourglassSandColor} />
              </View>
              <Text className="text-white text-lg mt-4">Loading stream...</Text>
            </Animated.View>
          </View>
        </TouchableNativeFeedback>
      </SafeAreaView>
    );
  }

  // Show error state
  if (streamError && !isCasting && selectedStream?.type !== 'local') {
    return (
      <SafeAreaView className="bg-black flex-1 justify-center items-center">
        <StatusBar translucent={true} hidden={true} />
        <OrientationLocker orientation={LANDSCAPE} />
        <Text className="text-red-500 text-lg text-center mb-4">
          Failed to load stream. Please try again.
        </Text>
        <TouchableOpacity
          className="bg-red-600 px-4 py-2 rounded-md"
          onPress={() => navigation.goBack()}>
          <Text className="text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={{
        right: 'off',
        top: 'off',
        left: 'off',
        bottom: 'off',
      }}
      className="bg-black flex-1 relative">
      <StatusBar translucent={true} hidden={true} />
      <OrientationLocker orientation={LANDSCAPE} />

      {/* Local or Cast player */}
      {remoteMediaClient ? (
        <CastRemotePlayer
          client={remoteMediaClient}
          title={route.params?.primaryTitle}
          subtitle={activeEpisode?.title || route.params?.secondaryTitle}
          artwork={
            route.params?.poster?.background || route.params?.poster?.poster
          }
          accentColor={primary}
          onBack={() => navigation.goBack()}
          onError={message => setToast(message, 3000)}
        />
      ) : processedStreamUrl ? (
        <VideoPlayer {...videoPlayerProps} />
      ) : (
        <View className="flex-1 justify-center items-center">
          <Animated.View style={[loadingContainerStyle]}>
            <AnimatedHourglass sandColor={hourglassSandColor} />
          </Animated.View>
          <TouchableOpacity
            className="mt-6 flex-row items-center gap-2 px-4 py-2"
            onPress={() => {
              setActiveTab('server');
              setShowSettings(true);
            }}>
            <MaterialIcons
              name={selectedPlayerQuality.icon}
              size={24}
              color="white"
            />
            <Text className="text-white text-sm capitalize opacity-80">
              {selectedStream?.server || 'Change server'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Non-intrusive Torrent Status Overlay */}
      {!isCasting &&
        selectedStream?.type === 'torrent' &&
        !streamLoading &&
        torrentState !== 'seeding' &&
        torrentState !== 'finished' && (
          <Animated.View
            className="absolute top-4 self-center px-3 py-1.5 rounded-full items-center"
            style={controlsOpacityStyle}
            pointerEvents="none">
            {torrentState !== 'Fetching Metadata...' ? (
              <Text className="text-white/70 text-[10px] mt-0.5">
                {torrentDownloaded > 0
                  ? `${torrentDownloaded.toFixed(1)} MB`
                  : ''}
                {torrentDownloadSpeed > 0
                  ? ` @ ${(torrentDownloadSpeed / 1024 / 1024).toFixed(1)} MB/s`
                  : ''}
              </Text>
            ) : (
              <Text className="text-white/90 text-xs font-medium">
                {torrentState === 'Fetching Metadata...'
                  ? 'Fetching Metadata'
                  : ''}
              </Text>
            )}
          </Animated.View>
        )}

      {/* Full-screen overlay to detect taps when locked */}
      {!isCasting && isPlayerLocked && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleLockedScreenTap}
          className="absolute top-0 left-0 right-0 bottom-0 z-40 bg-transparent"
        />
      )}

      {/* Lock/Unlock button */}
      {!isCasting && !streamLoading && !Platform.isTV && (
        <Animated.View
          style={[lockButtonStyle]}
          className="absolute top-5 right-5 flex-row items-center gap-2 z-50"
          pointerEvents="box-none">
          <TouchableOpacity
            onPress={togglePlayerLock}
            className="p-2 rounded-full">
            <MaterialCommunityIcons
              name={isPlayerLocked ? 'lock-outline' : 'lock-open-outline'}
              color={BOTTOM_CONTROL_ICON_COLOR}
              size={24}
            />
          </TouchableOpacity>
          {SHOW_FULLSCREEN_BUTTON && (
            <TouchableOpacity
              onPress={toggleFullScreen}
              className="opacity-70 p-2 rounded-full">
              <MaterialIcons
                name={isFullScreen ? 'fullscreen-exit' : 'fullscreen'}
                color={'hsl(0, 0%, 70%)'}
                size={24}
              />
            </TouchableOpacity>
          )}
          {!isPlayerLocked && canCastStream && (
            <View className="opacity-70 p-2 rounded-full">
              <CastButton
                accessibilityLabel="Cast video"
                tintColor="hsl(0, 0%, 70%)"
                style={{width: 24, height: 24}}
              />
            </View>
          )}
        </Animated.View>
      )}

      {/* Bottom controls */}
      {!isCasting && !isPlayerLocked && (
        <Animated.View
          style={[controlsStyle, {left: '10%', right: '10%', bottom: 20}]}
          className="absolute flex-row items-center">
          {/* Audio controls */}
          <TouchableOpacity
            onPress={() => {
              setActiveTab('audio');
              setShowSettings(!showSettings);
            }}
            className="min-w-0 flex-1 flex-row items-center justify-center gap-x-1">
            <MaterialCommunityIcons
              name="waveform"
              size={24}
              color={BOTTOM_CONTROL_ICON_COLOR}
            />
            <Text
              className="capitalize text-xs text-white"
              style={BOTTOM_CONTROL_LABEL_STYLE}
              numberOfLines={1}>
              {audioTracks[selectedAudioTrackIndex]?.language || 'auto'}
            </Text>
          </TouchableOpacity>

          {/* Subtitle controls */}
          <TouchableOpacity
            onPress={() => {
              setActiveTab('subtitle');
              setShowSettings(!showSettings);
            }}
            className="min-w-0 flex-1 flex-row items-center justify-center gap-x-1">
            <MaterialCommunityIcons
              name="subtitles-outline"
              size={24}
              color={BOTTOM_CONTROL_ICON_COLOR}
            />
            <Text
              className="text-xs capitalize text-white"
              style={BOTTOM_CONTROL_LABEL_STYLE}
              numberOfLines={1}>
              {selectedTextTrackIndex === 1000
                ? 'none'
                : textTracks[selectedTextTrackIndex]?.language}
            </Text>
          </TouchableOpacity>

          {/* Speed controls */}
          <TouchableOpacity
            className="min-w-0 flex-1 flex-row items-center justify-center gap-1"
            onPress={() => {
              setActiveTab('speed');
              setShowSettings(!showSettings);
            }}>
            <MaterialCommunityIcons
              name="speedometer"
              size={24}
              color={BOTTOM_CONTROL_ICON_COLOR}
            />
            <Text
              className="text-white text-sm"
              style={BOTTOM_CONTROL_LABEL_STYLE}>
              {playbackRate === 1 ? '1.0' : playbackRate}
            </Text>
          </TouchableOpacity>

          {/* PIP */}
          {!Platform.isTV && (
            <TouchableOpacity
              className="min-w-0 flex-1 flex-row items-center justify-center gap-1"
              onPress={() => {
                playerRef?.current?.enterPictureInPicture();
              }}>
              <MaterialCommunityIcons
                name="picture-in-picture-bottom-right-outline"
                size={24}
                color={BOTTOM_CONTROL_ICON_COLOR}
              />
              <Text
                className="text-white text-xs"
                style={BOTTOM_CONTROL_LABEL_STYLE}>
                PIP
              </Text>
            </TouchableOpacity>
          )}

          {/* Server & Quality */}
          <TouchableOpacity
            className="min-w-0 flex-1 flex-row items-center justify-center gap-1"
            onPress={() => {
              setActiveTab('server');
              setShowSettings(!showSettings);
            }}>
            <MaterialIcons
              name={selectedPlayerQuality.icon}
              size={24}
              color={BOTTOM_CONTROL_ICON_COLOR}
            />
            <Text
              className="text-xs text-white capitalize"
              style={BOTTOM_CONTROL_LABEL_STYLE}
              numberOfLines={1}>
              {selectedPlayerQuality.label}
            </Text>
          </TouchableOpacity>

          {/* Resize button */}
          <TouchableOpacity
            className="min-w-0 flex-1 flex-row items-center justify-center gap-1"
            onPress={handleResizeMode}>
            <MaterialCommunityIcons
              name="fit-to-screen-outline"
              size={25}
              color={BOTTOM_CONTROL_ICON_COLOR}
            />
            <Text
              className="text-white text-sm min-w-[38px]"
              style={BOTTOM_CONTROL_LABEL_STYLE}
              numberOfLines={1}>
              {resizeMode === ResizeMode.NONE
                ? 'Fit'
                : resizeMode === ResizeMode.COVER
                  ? 'Cover'
                  : resizeMode === ResizeMode.STRETCH
                    ? 'Stretch'
                    : 'Contain'}
            </Text>
          </TouchableOpacity>

          {/* Next episode button */}
          {route.params?.episodeList?.indexOf(activeEpisode) <
            route.params?.episodeList?.length - 1 &&
            videoPositionRef.current.position /
              videoPositionRef.current.duration >
              0.8 && (
              <TouchableOpacity
                className="min-w-0 flex-1 flex-row items-center justify-center"
                onPress={handleNextEpisode}>
                <Text
                  className="text-white text-base"
                  style={BOTTOM_CONTROL_LABEL_STYLE}
                  numberOfLines={1}>
                  Next
                </Text>
                <MaterialCommunityIcons
                  name="skip-next-outline"
                  size={26}
                  color={BOTTOM_CONTROL_ICON_COLOR}
                />
              </TouchableOpacity>
            )}
        </Animated.View>
      )}

      {/* Toast message */}
      <Animated.View
        style={[toastStyle]}
        pointerEvents="none"
        className="absolute w-full top-12 justify-center items-center px-2">
        <Text className="text-white bg-black/50 p-2 rounded-full text-base">
          {toastMessage}
        </Text>
      </Animated.View>

      {/* Settings Modal */}
      {!isCasting && !streamLoading && !isPlayerLocked && showSettings && (
        <Animated.View
          style={[settingsStyle, {backgroundColor: 'rgba(0,0,0,0.48)'}]}
          className="absolute opacity-0 top-0 left-0 w-full h-full justify-end items-center"
          onTouchEnd={() => setShowSettings(false)}>
          <View
            className="p-3 w-[620px] h-80 rounded-t-3xl flex-row justify-start items-center"
            style={{
              backgroundColor: 'rgba(13,13,13,0.94)',
              borderColor: 'rgba(255,255,255,0.12)',
              borderWidth: 1,
              shadowColor: '#000',
              shadowOpacity: 0.45,
              shadowRadius: 24,
              elevation: 18,
            }}
            onTouchEnd={e => e.stopPropagation()}>
            {/* Audio Tab */}
            {activeTab === 'audio' && (
              <ScrollView className="w-full h-full p-1 px-4">
                <Text className="mb-2 text-lg font-bold text-center text-white">
                  Audio
                </Text>
                {audioTracks.length === 0 && (
                  <View className="flex justify-center items-center">
                    <Text className="text-white text-xs">
                      Loading audio tracks...
                    </Text>
                  </View>
                )}
                {audioTracks.map((track, i) => (
                  <PlayerMenuRow
                    key={i}
                    title={track.language || `Audio track ${i + 1}`}
                    detail={[track.type, track.title]
                      .filter(Boolean)
                      .join(' · ')}
                    selected={selectedAudioTrackIndex === i}
                    accentColor={primary}
                    icon="multitrack-audio"
                    onPress={() => {
                      setSelectedAudioTrack({
                        type: SelectedTrackType.LANGUAGE,
                        value: track.language,
                      });
                      cacheStorage.setString(
                        'lastAudioTrack',
                        track.language || '',
                      );
                      setSelectedAudioTrackIndex(i);
                      setShowSettings(false);
                    }}
                  />
                ))}
              </ScrollView>
            )}

            {/* Subtitle Tab */}
            {activeTab === 'subtitle' && (
              <FlashList
                data={textTracks}
                ListHeaderComponent={
                  <View>
                    <Text className="mb-2 text-lg font-bold text-center text-white">
                      Subtitle
                    </Text>
                    <PlayerMenuRow
                      title="Disabled"
                      selected={selectedTextTrackIndex === 1000}
                      accentColor={primary}
                      icon="subtitles-off"
                      onPress={() => {
                        setSelectedTextTrack({
                          type: SelectedTrackType.DISABLED,
                        });
                        setSelectedTextTrackIndex(1000);
                        cacheStorage.setString('lastTextTrack', '');
                        setShowSettings(false);
                      }}
                    />
                  </View>
                }
                ListFooterComponent={
                  <>
                    <PlayerMenuRow
                      title="Add external file"
                      accentColor={primary}
                      icon="add"
                      onPress={async () => {
                        try {
                          const res = await DocumentPicker.getDocumentAsync({
                            type: [
                              'text/vtt',
                              'application/x-subrip',
                              'text/srt',
                              'application/ttml+xml',
                            ],
                            multiple: false,
                          });

                          if (!res.canceled && res.assets?.[0]) {
                            const asset = res.assets[0];
                            const track = {
                              type: asset.mimeType as any,
                              title:
                                asset.name && asset.name.length > 20
                                  ? asset.name.slice(0, 20) + '...'
                                  : asset.name || 'undefined',
                              language: 'und',
                              uri: asset.uri,
                            };
                            setExternalSubs((prev: any) => [track, ...prev]);
                          }
                        } catch (err) {
                          console.log(err);
                        }
                      }}
                    />
                    <SearchSubtitles
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      setExternalSubs={setExternalSubs}
                    />
                  </>
                }
                renderItem={({item: track}) => (
                  <PlayerMenuRow
                    title={track.language || 'Unknown'}
                    detail={[track.type, track.title]
                      .filter(Boolean)
                      .join(' · ')}
                    selected={selectedTextTrackIndex === track.index}
                    accentColor={primary}
                    icon="subtitles"
                    onPress={() => {
                      setSelectedTextTrack({
                        type: SelectedTrackType.INDEX,
                        value: track.index,
                      });
                      setSelectedTextTrackIndex(track.index);
                      cacheStorage.setString(
                        'lastTextTrack',
                        track.language || '',
                      );
                      setShowSettings(false);
                    }}
                  />
                )}
              />
            )}

            {/* Server Tab */}
            {activeTab === 'server' && (
              <View className="flex flex-row w-full h-full p-1 px-4">
                <ScrollView
                  className="border-r border-white/10"
                  contentContainerStyle={{paddingRight: 8}}>
                  <Text className="mb-2 w-full text-center text-white text-lg font-extrabold">
                    Server
                  </Text>
                  {streamData?.length > 0 &&
                    streamData?.map((track, i) => (
                      <PlayerMenuRow
                        key={i}
                        title={track.server || `Server ${i + 1}`}
                        detail={track.quality}
                        selected={track.link === selectedStream.link}
                        accentColor={primary}
                        icon="dns"
                        onPress={() => {
                          setSelectedStream(track);
                          appliedPersistedLocalVideoRef.current = true;
                          if (activeEpisodeKey) {
                            clearLocalVideoAssociation(activeEpisodeKey);
                          }
                          setShowSettings(false);
                          playerRef?.current?.resume();
                        }}
                      />
                    ))}

                  {/* Local video option, mirrors the subtitle screen's
                      "Add external file" entry above */}
                  <View className="mt-1 border-t border-white/10 pt-1">
                    <PlayerMenuRow
                      title="Local video"
                      detail="Choose a file from this device"
                      selected={selectedStream?.type === 'local'}
                      accentColor={primary}
                      icon="folder-open"
                      onPress={handleSelectLocalVideo}
                    />
                  </View>
                </ScrollView>

                <ScrollView contentContainerStyle={{paddingLeft: 8}}>
                  <Text className="mb-2 w-full text-center text-white text-lg font-extrabold">
                    Quality
                  </Text>

                  {videoTracks &&
                    videoTracks.map((track: any, i: any) => (
                      <PlayerMenuRow
                        key={i}
                        title={`${track.height}x${track.width}`}
                        detail={[
                          track.bitrate && `Bitrate ${track.bitrate}`,
                          track.codecs && `Codec ${track.codecs}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        selected={selectedQualityIndex === i}
                        accentColor={primary}
                        icon={getQualityIconName(track.height)}
                        onPress={() => {
                          setSelectedVideoTrack({
                            type: SelectedVideoTrackType.INDEX,
                            value: track.index,
                          });
                          setSelectedQualityIndex(i);
                        }}
                      />
                    ))}
                </ScrollView>
              </View>
            )}

            {/* Speed Tab */}
            {activeTab === 'speed' && (
              <ScrollView className="w-full h-full p-1 px-4">
                <Text className="mb-2 text-lg font-bold text-center text-white">
                  Playback Speed
                </Text>
                {playbacks.map((rate, i) => (
                  <PlayerMenuRow
                    key={i}
                    title={`${rate}x`}
                    selected={playbackRate === rate}
                    accentColor={primary}
                    icon="speed"
                    onPress={() => {
                      setPlaybackRate(rate);
                      setShowSettings(false);
                    }}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

export default Player;
