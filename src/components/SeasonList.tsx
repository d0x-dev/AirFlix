import AppText from '../components/ui/Text';
import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  TouchableOpacity,
  ToastAndroid,
  FlatList,
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Feather from '@expo/vector-icons/Feather';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import * as IntentLauncher from 'expo-intent-launcher';
import RNReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {EpisodeLink, Link} from '../lib/providers/types';
import {RootStackParamList} from '../App';
import Downloader from './Downloader';
import {cacheStorage, mainStorage, settingsStorage} from '../lib/storage';
import {ifExists} from '../lib/file/ifExists';
import {useEpisodes, useStreamData} from '../lib/hooks/useEpisodes';
import SkeletonLoader from './Skeleton';
import DropdownField from './ui/DropdownField';
import {
  createDesktopCompatibleFileName,
  createDirectDownloadId,
  createSeriesDownloadId,
} from '../lib/downloadId';
import useDownloadsStore from '../lib/zustand/downloadsStore';
import {useM3Colors} from '../theme/M3PaletteContext';
import MaterialDialogSurface from './ui/MaterialDialogSurface';
import {LEGACY_TERTIARY_BACKGROUND} from '../theme/seeds';
import Text from './ui/Text';
import EpisodeRowContent, {getValidImageUri} from './EpisodeRowContent';
import {setSyncedEpisodeProgress} from '../lib/sync/syncService';

const CONTROL_TEXT = '#F5F0EF';
const CONTROL_TEXT_MUTED = '#D4CBC9';
// const CONTROL_OUTLINE = '#494240';

interface SeasonListProps {
  LinkList: Link[];
  poster: {
    logo?: string;
    poster?: string;
    background?: string;
  };
  type: string;
  metaTitle: string;
  providerValue: string;
  refreshing?: boolean;
  routeParams: Readonly<{
    link: string;
    provider?: string;
    poster?: string;
  }>;
  imdbId?: string;
  synopsis?: string;
  refreshVersion?: number;
}

interface PlayHandlerProps {
  linkIndex: number;
  type: string;
  primaryTitle: string;
  seasonTitle: string;
  episodeData: EpisodeLink[] | Link['directLinks'];
}

interface StickyMenuState {
  active: boolean;
  link?: string;
  type?: string;
}

interface EpisodeDetailsState {
  title: string;
  description: string;
  image?: string;
}

const getOriginalLinkIndex = <T extends {link: string}>(
  links: T[] | undefined,
  link: string,
  fallbackIndex: number,
): number => {
  const originalIndex = links?.findIndex(item => item.link === link) ?? -1;
  return originalIndex >= 0 ? originalIndex : fallbackIndex;
};

const SeasonList: React.FC<SeasonListProps> = ({
  LinkList,
  poster,
  type,
  metaTitle,
  providerValue,
  refreshing,
  routeParams,
  imdbId,
  synopsis,
  refreshVersion,
}) => {
  const colors = useM3Colors();
  const primary = colors.primary;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {fetchStreams} = useStreamData();
  const detailsPressRef = useRef<string | null>(null);
  const episodeSortOrderKey = `episodeSortOrder:${providerValue}:${routeParams.link}`;

  // Early return if no LinkList provided
  if (!LinkList || LinkList.length === 0) {
    return (
      <View className="p-4">
        <AppText className="text-white text-center">No Streams Available</AppText>
      </View>
    );
  }

  // Memoized initial active season
  const [activeSeason, setActiveSeason] = useState<Link>(() => {
    if (!LinkList || LinkList.length === 0) {
      return {} as Link;
    }

    const cached = cacheStorage.getString(
      `ActiveSeason${metaTitle + providerValue}`,
    );

    if (cached) {
      try {
        const parsedSeason = JSON.parse(cached);
        // Verify the cached season still exists in LinkList
        const seasonExists = LinkList.find(
          link => link.title === parsedSeason.title,
        );
        if (seasonExists) {
          return parsedSeason;
        }
      } catch (error) {
        console.warn('Failed to parse cached season:', error);
      }
    }

    return LinkList[0];
  });

  // React Query for episodes
  const {
    data: episodeList = [],
    isLoading: episodeLoading,
    error: episodeError,
    refetch: refetchEpisodes,
  } = useEpisodes(
    activeSeason?.episodesLink,
    providerValue,
    activeSeason?.episodesLink ? true : false,
  );

  useEffect(() => {
    if (refreshing && activeSeason?.episodesLink) {
      refetchEpisodes();
    }
  }, [activeSeason?.episodesLink, refetchEpisodes, refreshVersion, refreshing]);

  // UI state
  const [vlcLoading, setVlcLoading] = useState<boolean>(false);
  const [stickyMenu, setStickyMenu] = useState<StickyMenuState>({
    active: false,
  });

  // Search and sorting state - memoized initial values
  const [searchText, setSearchText] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() =>
    mainStorage.getString(episodeSortOrderKey) === 'desc' ? 'desc' : 'asc',
  );

  useEffect(() => {
    setSortOrder(
      mainStorage.getString(episodeSortOrderKey) === 'desc' ? 'desc' : 'asc',
    );
  }, [episodeSortOrderKey]);

  // External player state
  const [showServerModal, setShowServerModal] = useState<boolean>(false);
  const [externalPlayerStreams, setExternalPlayerStreams] = useState<any[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState<boolean>(false);
  const [episodeDetails, setEpisodeDetails] =
    useState<EpisodeDetailsState | null>(null);
  const [episodeDetailsImageFailed, setEpisodeDetailsImageFailed] =
    useState(false);

  useEffect(() => {
    setEpisodeDetailsImageFailed(false);
  }, [episodeDetails?.image]);

  // VLC loading animation - using shared value so it reacts to vlcLoading state
  const vlcRotation = useSharedValue(0);

  useEffect(() => {
    if (vlcLoading) {
      vlcRotation.value = 0;
      vlcRotation.value = withRepeat(
        withTiming(360, {duration: 800}),
        -1,
        false,
      );
    } else {
      cancelAnimation(vlcRotation);
      vlcRotation.value = 0;
    }
  }, [vlcLoading]);

  const vlcLoadingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${vlcRotation.value}deg`}],
  }));

  // Memoized filtering and sorting logic for episodes
  const filteredAndSortedEpisodes = useMemo(() => {
    if (!episodeList || !Array.isArray(episodeList)) {
      return [];
    }

    let episodes = episodeList.filter(
      episode => episode && episode.title && episode.link,
    );

    // Apply search filter
    if (searchText.trim()) {
      episodes = episodes.filter(episode =>
        episode?.title?.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    // Apply sorting
    if (sortOrder === 'desc') {
      episodes = [...episodes].reverse();
    }

    return episodes;
  }, [episodeList, searchText, sortOrder]);

  // Memoized direct links processing
  const filteredAndSortedDirectLinks = useMemo(() => {
    if (
      !activeSeason?.directLinks ||
      !Array.isArray(activeSeason.directLinks)
    ) {
      return [];
    }

    let links = activeSeason.directLinks.filter(
      link => link && link.title && link.link,
    );

    // Apply search filter
    if (searchText.trim()) {
      links = links.filter(link =>
        link?.title?.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    // Apply sorting
    if (sortOrder === 'desc') {
      links = [...links].reverse();
    }

    return links;
  }, [activeSeason?.directLinks, searchText, sortOrder]);

  // Memoized completion checker
  const isCompleted = useCallback((link: string) => {
    const watchProgress = JSON.parse(cacheStorage.getString(link) || '{}');
    const percentage =
      (watchProgress?.position / watchProgress?.duration) * 100;
    return percentage > 85;
  }, []);

  // Memoized toggle sort order
  const toggleSortOrder = useCallback(() => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    mainStorage.setString(episodeSortOrderKey, newOrder);
  }, [episodeSortOrderKey, sortOrder]);

  // Memoized season change handler
  const handleSeasonChange = useCallback(
    (item: Link) => {
      setActiveSeason(item);
      cacheStorage.setString(
        `ActiveSeason${metaTitle + providerValue}`,
        JSON.stringify(item),
      );
    },
    [metaTitle, providerValue],
  );

  // Memoized external player handler
  const handleExternalPlayer = useCallback(
    async (link: string, streamType: string) => {
      setVlcLoading(true);
      setIsLoadingStreams(true);

      try {
        const streams = await fetchStreams(link, streamType, providerValue);

        if (!streams || streams.length === 0) {
          ToastAndroid.show(
            'No streams available from provider',
            ToastAndroid.SHORT,
          );
          return;
        }

        console.log('Available Streams Count:', streams.length);
        setExternalPlayerStreams([...streams]);
        setIsLoadingStreams(false);
        setVlcLoading(false);
        setShowServerModal(true);

        ToastAndroid.show(
          `Found ${streams.length} servers`,
          ToastAndroid.SHORT,
        );
      } catch (error: any) {
        console.error('Error fetching streams:', error);
        const errorMessage = error?.message || 'Failed to load streams';
        ToastAndroid.show(errorMessage, ToastAndroid.SHORT);
      } finally {
        setVlcLoading(false);
        setIsLoadingStreams(false);
      }
    },
    [fetchStreams, providerValue],
  );

  // Memoized external player opener
  const openExternalPlayer = useCallback(async (streamUrl: string) => {
    setShowServerModal(false);
    setVlcLoading(true);

    try {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: streamUrl,
        type: 'video/*',
      });
    } catch (error) {
      console.error('Error opening external player:', error);
      ToastAndroid.show('Failed to open external player', ToastAndroid.SHORT);
    } finally {
      setVlcLoading(false);
    }
  }, []);

  // Memoized play handler
  const playHandler = useCallback(
    async ({
      linkIndex,
      type: playbackType,
      primaryTitle,
      seasonTitle,
      episodeData,
    }: PlayHandlerProps) => {
      if (!episodeData || episodeData.length === 0) {
        return;
      }

      const link = episodeData[linkIndex].link;
      const file = (
        metaTitle +
        seasonTitle +
        episodeData[linkIndex]?.title
      ).replaceAll(/[^a-zA-Z0-9]/g, '_');

      const externalPlayer = settingsStorage.getBool('useExternalPlayer');
      const dwFile = await ifExists(file);

      if (externalPlayer) {
        if (dwFile) {
          await IntentLauncher.startActivityAsync(
            'android.intent.action.VIEW',
            {
              data: dwFile,
              type: 'video/*',
            },
          );
          return;
        }
        handleExternalPlayer(link, playbackType);
        return;
      }

      navigation.navigate('Player', {
        linkIndex,
        episodeList: episodeData,
        type: playbackType,
        primaryTitle: primaryTitle,
        secondaryTitle: seasonTitle,
        poster: poster,
        providerValue: providerValue,
        infoUrl: routeParams.link,
      });
    },
    [
      routeParams.link,
      poster,
      providerValue,
      metaTitle,
      handleExternalPlayer,
      navigation,
    ],
  );

  // Memoized long press handler
  const onLongPressHandler = useCallback(
    (active: boolean, link: string, streamType?: string) => {
      if (settingsStorage.isHapticFeedbackEnabled()) {
        RNReactNativeHapticFeedback.trigger('effectTick', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
      setStickyMenu({active: active, link: link, type: streamType});
    },
    [],
  );

  // Memoized mark as watched handler
  const markAsWatched = useCallback(() => {
    if (stickyMenu.link) {
      cacheStorage.setString(
        stickyMenu.link,
        JSON.stringify({
          position: 1,
          duration: 1,
        }),
      );
      const episode = [
        ...episodeList,
        ...(activeSeason.directLinks || []),
      ].find(item => item.link === stickyMenu.link);
      if (episode) {
        setSyncedEpisodeProgress({
          episode,
          title: metaTitle,
          poster: poster.poster,
          background: poster.background,
          provider: providerValue,
          infoUrl: routeParams.link,
          type,
          position: 1,
          duration: 1,
        });
      }
      setStickyMenu({active: false});
    }
  }, [
    activeSeason.directLinks,
    episodeList,
    metaTitle,
    poster.background,
    poster.poster,
    providerValue,
    routeParams.link,
    stickyMenu.link,
    type,
  ]);

  // Memoized mark as unwatched handler
  const markAsUnwatched = useCallback(() => {
    if (stickyMenu.link) {
      cacheStorage.setString(
        stickyMenu.link,
        JSON.stringify({
          position: 0,
          duration: 1,
        }),
      );
      const episode = [
        ...episodeList,
        ...(activeSeason.directLinks || []),
      ].find(item => item.link === stickyMenu.link);
      if (episode) {
        setSyncedEpisodeProgress({
          episode,
          title: metaTitle,
          poster: poster.poster,
          background: poster.background,
          provider: providerValue,
          infoUrl: routeParams.link,
          type,
          position: 0,
          duration: 1,
        });
      }
      setStickyMenu({active: false});
    }
  }, [
    activeSeason.directLinks,
    episodeList,
    metaTitle,
    poster.background,
    poster.poster,
    providerValue,
    routeParams.link,
    stickyMenu.link,
    type,
  ]);

  // Memoized sticky menu external player handler
  const handleStickyMenuExternalPlayer = useCallback(() => {
    setStickyMenu({active: false});
    if (stickyMenu.link && stickyMenu.type) {
      handleExternalPlayer(stickyMenu.link, stickyMenu.type);
    }
  }, [stickyMenu.link, stickyMenu.type, handleExternalPlayer]);

  // Memoized episode render item
  const renderEpisodeItem = useCallback(
    ({item, index}: {item: EpisodeLink; index: number}) => {
      if (!item || !item.link || !item.title) {
        console.warn('Invalid episode item at index', index, item);
        return null; // Skip rendering if item is invalid
      }

      const downloadIndex = getOriginalLinkIndex(episodeList, item.link, index);
      const downloadId = createSeriesDownloadId(
        metaTitle,
        activeSeason.title,
        downloadIndex,
      );
      const handleEpisodePress = () => {
        const localDownload =
          useDownloadsStore.getState().downloads[downloadId];
        if (localDownload?.status === 'completed') {
          navigation.navigate('Player', {
            episodeList: [
              {
                id: localDownload.id,
                title: item.title,
                link: localDownload.filePath,
                sourceLink: localDownload.sourceLink,
              },
            ],
            linkIndex: 0,
            type: '',
            directUrl: localDownload.filePath,
            primaryTitle: metaTitle,
            secondaryTitle: activeSeason.title,
            poster,
            providerValue,
            infoUrl: localDownload.infoUrl || routeParams.link,
          });
          return;
        }
        playHandler({
          linkIndex: index,
          type,
          primaryTitle: metaTitle,
          seasonTitle: activeSeason?.title || '',
          episodeData: filteredAndSortedEpisodes,
        });
      };
      return (
        <View
          key={item.link + index}
          className={`w-full my-1.5
          ${
            isCompleted(item.link) || stickyMenu.link === item.link
              ? 'opacity-60'
              : ''
          }
        `}>
          <View
            className="min-h-[76px] flex-row w-full items-center px-3 py-2"
            style={{
              backgroundColor: LEGACY_TERTIARY_BACKGROUND,
              // borderColor: CONTROL_OUTLINE,
              borderRadius: 14,
              borderWidth: 1,
            }}>
            <TouchableOpacity
              activeOpacity={0.65}
              className="min-w-0 flex-1 items-center flex-row gap-x-3"
              onPress={() => {
                if (detailsPressRef.current === item.link) {
                  detailsPressRef.current = null;
                  return;
                }
                handleEpisodePress();
              }}
              onLongPress={() =>
                onLongPressHandler(true, item.link, 'series')
              }>
              <EpisodeRowContent
                title={item.title}
                description={item.description}
                image={item.image}
                accentColor={primary}
                textColor={CONTROL_TEXT}
                mutedTextColor={CONTROL_TEXT_MUTED}
                onShowDetailsPressIn={() => {
                  detailsPressRef.current = item.link;
                }}
                onShowDetails={
                  item.description?.trim()
                    ? () => {
                        setEpisodeDetails({
                          title: item.title,
                          description: item.description!.trim(),
                          image: item.image,
                        });
                        setTimeout(() => {
                          if (detailsPressRef.current === item.link) {
                            detailsPressRef.current = null;
                          }
                        }, 0);
                      }
                    : undefined
                }
              />
            </TouchableOpacity>
            <Downloader
              downloadId={downloadId}
              providerValue={providerValue}
              link={item.link}
              type={type}
              mediaType="series"
              showName={metaTitle}
              seasonTitle={activeSeason.title}
              episodeName={item.title}
              imdbId={imdbId}
              poster={poster.poster}
              background={poster.background}
              synopsis={synopsis}
              infoUrl={routeParams.link}
              title={
                metaTitle.length > 30
                  ? metaTitle.slice(0, 30) + '... ' + item.title
                  : metaTitle + ' ' + item.title
              }
              fileName={createDesktopCompatibleFileName(
                `${activeSeason.title}_${item.title}`,
                'series',
              )}
            />
          </View>
        </View>
      );
    },
    [
      isCompleted,
      stickyMenu.link,
      playHandler,
      metaTitle,
      activeSeason?.title,
      episodeList,
      filteredAndSortedEpisodes,
      onLongPressHandler,
      primary,
      providerValue,
      routeParams.link,
      imdbId,
      poster.poster,
    ],
  );

  // Memoized direct link render item
  const renderDirectLinkItem = useCallback(
    ({item, index}: {item: any; index: number}) => {
      if (!item || !item.link || !item.title) {
        console.warn('Invalid direct link item at index', index, item);
        return null; // Skip rendering if item is invalid
      }

      const downloadIndex = getOriginalLinkIndex(
        activeSeason.directLinks,
        item.link,
        index,
      );
      const downloadId = createDirectDownloadId(
        metaTitle,
        activeSeason.title,
        downloadIndex,
      );
      const displayTitle =
        activeSeason?.directLinks?.length && activeSeason.directLinks.length > 1
          ? item.title
          : 'Play';
      const handleEpisodePress = () => {
        const localDownload =
          useDownloadsStore.getState().downloads[downloadId];
        if (localDownload?.status === 'completed') {
          navigation.navigate('Player', {
            episodeList: [
              {
                id: localDownload.id,
                title: item.title,
                link: localDownload.filePath,
                sourceLink: localDownload.sourceLink,
              },
            ],
            linkIndex: 0,
            type: '',
            directUrl: localDownload.filePath,
            primaryTitle: metaTitle,
            secondaryTitle: activeSeason.title,
            poster,
            providerValue,
            infoUrl: localDownload.infoUrl || routeParams.link,
          });
          return;
        }
        playHandler({
          linkIndex: index,
          type,
          primaryTitle: metaTitle,
          seasonTitle: activeSeason?.title || '',
          episodeData: filteredAndSortedDirectLinks,
        });
      };

      return (
        <View
          key={item.link + index}
          className={`w-full my-1.5
          ${
            isCompleted(item.link) || stickyMenu.link === item.link
              ? 'opacity-60'
              : ''
          }
        `}>
          <View
            className="min-h-[76px] flex-row w-full items-center px-3 py-2"
            style={{
              backgroundColor: LEGACY_TERTIARY_BACKGROUND,
              // borderColor: CONTROL_OUTLINE,
              borderRadius: 14,
              borderWidth: 1,
            }}>
            <TouchableOpacity
              activeOpacity={0.65}
              className="min-w-0 flex-1 items-center flex-row gap-x-3"
              onPress={() => {
                if (detailsPressRef.current === item.link) {
                  detailsPressRef.current = null;
                  return;
                }
                handleEpisodePress();
              }}
              onLongPress={() =>
                onLongPressHandler(true, item.link, item?.type || 'series')
              }>
              <EpisodeRowContent
                title={displayTitle}
                description={item.description}
                image={item.image}
                accentColor={primary}
                textColor={CONTROL_TEXT}
                mutedTextColor={CONTROL_TEXT_MUTED}
                onShowDetailsPressIn={() => {
                  detailsPressRef.current = item.link;
                }}
                onShowDetails={
                  item.description?.trim()
                    ? () => {
                        setEpisodeDetails({
                          title: item.title,
                          description: item.description.trim(),
                          image: item.image,
                        });
                        setTimeout(() => {
                          if (detailsPressRef.current === item.link) {
                            detailsPressRef.current = null;
                          }
                        }, 0);
                      }
                    : undefined
                }
              />
            </TouchableOpacity>
            <Downloader
              downloadId={downloadId}
              providerValue={providerValue}
              link={item.link}
              type={type}
              mediaType={item?.type === 'series' ? 'series' : 'movie'}
              showName={metaTitle}
              seasonTitle={activeSeason.title}
              episodeName={item.title}
              imdbId={imdbId}
              poster={poster.poster}
              background={poster.background}
              synopsis={synopsis}
              infoUrl={routeParams.link}
              title={
                metaTitle.length > 30
                  ? metaTitle.slice(0, 30) + '... ' + item.title
                  : metaTitle + ' ' + item.title
              }
              fileName={createDesktopCompatibleFileName(
                `${activeSeason.title}_${item.title}`,
                'series',
              )}
            />
          </View>
        </View>
      );
    },
    [
      isCompleted,
      stickyMenu.link,
      playHandler,
      metaTitle,
      activeSeason?.title,
      activeSeason?.directLinks,
      filteredAndSortedDirectLinks,
      onLongPressHandler,
      primary,
      providerValue,
      routeParams.link,
      imdbId,
      poster.poster,
    ],
  );

  // Memoized server render item
  const renderServerItem = useCallback(
    (item: any, index: number) => (
      <TouchableOpacity
        key={`server-${index}-${item.server}`}
        className="mb-2 flex-row items-center justify-between p-3"
        style={{
          backgroundColor: LEGACY_TERTIARY_BACKGROUND,
          // borderColor: CONTROL_OUTLINE,
          borderRadius: 14,
          borderWidth: 1,
        }}
        onPress={() => openExternalPlayer(item.link)}>
        <View>
          <AppText
            className="text-lg capitalize font-bold"
            style={{color: CONTROL_TEXT}}>
            {item.server || `Server ${index + 1}`}
          </AppText>
          <AppText className="text-xs" style={{color: CONTROL_TEXT_MUTED}}>
            {item.type ? `Format: ${item.type.toUpperCase()}` : ''}
          </AppText>
        </View>
        <MaterialCommunityIcons name="vlc" size={24} color={primary} />
      </TouchableOpacity>
    ),
    [colors, primary, openExternalPlayer],
  );

  // Show loading skeleton while episodes are loading
  if (episodeLoading) {
    return (
      <View>
        {LinkList.length > 1 && (
          <DropdownField
            options={LinkList}
            value={activeSeason}
            getKey={item =>
              item.episodesLink || item.directLinks?.[0]?.link || item.title
            }
            getLabel={item => item.title || 'Unknown'}
            onChange={handleSeasonChange}
            showFullOptionLabels
          />
        )}

        <View
          style={{
            width: '100%',
            padding: 10,
            alignItems: 'flex-start',
            gap: 20,
          }}>
          {[...Array(6)].map((_, index) => (
            <SkeletonLoader key={index} show={true} height={48} width={'85%'} />
          ))}
        </View>
      </View>
    );
  }

  // Show error state
  if (episodeError) {
    return (
      <View className="p-4">
        <AppText className="text-red-500 text-center">
          {episodeError.message || 'Failed to load episodes. Please try again.'}
        </AppText>
        <TouchableOpacity
          className="mt-2 bg-red-600 p-2 rounded-md"
          onPress={() => refetchEpisodes()}>
          <AppText className="text-white text-center">Retry</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      {/* Season Selector */}
      <DropdownField
        options={LinkList}
        value={activeSeason}
        getKey={item =>
          item.episodesLink || item.directLinks?.[0]?.link || item.title
        }
        getLabel={item => item.title || 'Unknown'}
        onChange={handleSeasonChange}
        showFullOptionLabels
        style={{marginBottom: 8}}
      />

      {/* Search and Sort Controls */}
      {(episodeList.length > 2 ||
        (activeSeason?.directLinks && activeSeason.directLinks?.length > 2) ||
        searchText) && (
        <View className="flex-row items-center mt-2">
          <View
            style={{
              backgroundColor: colors.surfaceContainerHigh,
              borderColor: colors.outlineVariant,
              borderRadius: 18,
              borderWidth: 1,
              flex: 1,
              flexDirection: 'row',
              height: 48,
              marginRight: 10,
              overflow: 'hidden',
            }}>
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingLeft: 14,
              }}>
              <MaterialCommunityIcons
                name="magnify"
                size={22}
                color={colors.primary}
              />
            </View>
            <TextInput
              accessibilityLabel="Find episode"
              placeholder="Find episode"
              placeholderTextColor={colors.onSurfaceVariant}
              selectionColor={colors.primary}
              returnKeyType="search"
              style={{
                color: colors.onSurface,
                flex: 1,
                fontSize: 16,
                paddingHorizontal: 10,
                paddingVertical: 0,
              }}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <TouchableOpacity
            accessibilityLabel={
              sortOrder === 'asc'
                ? 'Sort episodes descending'
                : 'Sort episodes ascending'
            }
            className="h-12 w-12 flex-row items-center justify-center"
            style={{
              backgroundColor: colors.secondaryContainer,
              borderRadius: 18,
            }}
            onPress={toggleSortOrder}>
            <MaterialCommunityIcons
              name={sortOrder === 'asc' ? 'sort-ascending' : 'sort-descending'}
              size={24}
              color={colors.onSecondaryContainer}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Episode/Direct Links List */}
      <View className="w-full mt-3">
        {/* Episodes List */}
        {filteredAndSortedEpisodes.length > 0 && (
          <FlatList
            data={filteredAndSortedEpisodes}
            keyExtractor={(item, index) => `episode-${item.link}-${index}`}
            renderItem={renderEpisodeItem}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
          />
        )}

        {/* Direct Links List */}
        {filteredAndSortedDirectLinks.length > 0 && (
          <View className="w-full mt-2">
            <FlatList
              data={filteredAndSortedDirectLinks}
              keyExtractor={(item, index) => `direct-${item.link}-${index}`}
              renderItem={renderDirectLinkItem}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={true}
            />
          </View>
        )}

        {/* No Content Available */}
        {filteredAndSortedEpisodes.length === 0 &&
          filteredAndSortedDirectLinks.length === 0 &&
          LinkList?.length === 0 && (
            <AppText
              className="min-h-20 text-lg font-semibold"
              style={{color: colors.onSurfaceVariant}}>
              No stream found
            </AppText>
          )}
      </View>

      {/* VLC Loading Indicator */}
      {vlcLoading && (
        <View className="absolute top-0 left-0 w-full h-full bg-black/60 bg-opacity-50 justify-center items-center">
          <Animated.View style={[vlcLoadingAnimatedStyle]}>
            <MaterialCommunityIcons name="vlc" size={70} color={primary} />
          </Animated.View>
          <AppText
            className="mt-2 text-lg font-semibold"
            style={{color: colors.onSurface}}>
            Loading available servers...
          </AppText>
        </View>
      )}

      <MaterialDialogSurface
        visible={episodeDetails !== null}
        onDismiss={() => setEpisodeDetails(null)}
        style={{padding: 0}}>
        {episodeDetails ? (
          <>
            {getValidImageUri(episodeDetails.image) &&
            !episodeDetailsImageFailed ? (
              <Image
                source={{uri: getValidImageUri(episodeDetails.image)}}
                resizeMode="cover"
                onError={() => setEpisodeDetailsImageFailed(true)}
                style={{aspectRatio: 16 / 9, width: '100%'}}
              />
            ) : (
              <View
                style={{
                  alignItems: 'center',
                  aspectRatio: 16 / 9,
                  backgroundColor: colors.surfaceContainerHighest,
                  justifyContent: 'center',
                  width: '100%',
                }}>
                <MaterialCommunityIcons
                  name="image-off-outline"
                  size={44}
                  color={colors.onSurfaceVariant}
                />
              </View>
            )}
            <View style={{padding: 20}}>
              <AppText
                role="titleLarge"
                style={{color: colors.onSurface, fontWeight: '700'}}>
                {episodeDetails.title}
              </AppText>
              <ScrollView style={{maxHeight: 230}}>
                <AppText
                  role="bodyMedium"
                  style={{
                    color: colors.onSurfaceVariant,
                    lineHeight: 22,
                    marginTop: 10,
                  }}>
                  {episodeDetails.description}
                </AppText>
              </ScrollView>
            </View>
          </>
        ) : null}
      </MaterialDialogSurface>

      <MaterialDialogSurface
        visible={showServerModal}
        onDismiss={() => setShowServerModal(false)}>
        <AppText
          className="mb-2 text-center text-xl font-bold"
          style={{color: colors.onSurface}}>
          Select External Player Server
        </AppText>
        <AppText
          className="mb-4 text-center text-sm"
          style={{color: colors.onSurfaceVariant}}>
          {externalPlayerStreams.length} servers available
        </AppText>

        {isLoadingStreams ? (
          <ActivityIndicator size="large" color={primary} />
        ) : (
          <>
            <ScrollView style={{maxHeight: 300}}>
              {externalPlayerStreams.map((item, index) =>
                renderServerItem(item, index),
              )}
              {externalPlayerStreams.length === 0 && (
                <AppText
                  className="p-4 text-center"
                  style={{color: colors.onSurfaceVariant}}>
                  No servers available
                </AppText>
              )}
            </ScrollView>

            <TouchableOpacity
              className="mt-4 py-3"
              style={{
                backgroundColor: colors.secondaryContainer,
                borderRadius: 18,
              }}
              onPress={() => setShowServerModal(false)}>
              <AppText
                className="text-center font-bold"
                style={{color: colors.onSecondaryContainer}}>
                Cancel
              </AppText>
            </TouchableOpacity>
          </>
        )}
      </MaterialDialogSurface>

      <MaterialDialogSurface
        visible={stickyMenu.active}
        onDismiss={() => setStickyMenu({active: false})}>
        <AppText
          className="mb-4 text-xl font-bold"
          style={{color: colors.onSurface}}>
          Episode actions
        </AppText>
        <View style={{gap: 10}}>
          {isCompleted(stickyMenu.link || '') ? (
            <TouchableOpacity
              className="h-12 flex-row items-center gap-3 px-4"
              style={{
                backgroundColor: colors.surfaceContainerHighest,
                borderRadius: 18,
              }}
              onPress={markAsUnwatched}>
              <Ionicons name="checkmark-done" size={30} color={primary} />
              <AppText style={{color: colors.onSurface}}>Mark as unwatched</AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="h-12 flex-row items-center gap-3 px-4"
              style={{
                backgroundColor: colors.surfaceContainerHighest,
                borderRadius: 18,
              }}
              onPress={markAsWatched}>
              <Ionicons name="checkmark" size={25} color={primary} />
              <AppText style={{color: colors.onSurface}}>Mark as watched</AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="h-12 flex-row items-center gap-3 px-4"
            style={{
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: 18,
            }}
            onPress={handleStickyMenuExternalPlayer}>
            <Feather name="external-link" size={20} color={primary} />
            <AppText style={{color: colors.onSurface}}>External player</AppText>
          </TouchableOpacity>
        </View>
      </MaterialDialogSurface>
    </View>
  );
};

export default SeasonList;
