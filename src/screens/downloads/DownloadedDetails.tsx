import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type {DownloadsStackParamList, RootStackParamList} from '../../App';
import AppDialog from '../../components/AppDialog';
import DropdownField from '../../components/ui/DropdownField';
import {
  deleteDownloadOutput,
  downloadOutputExists,
} from '../../lib/downloadDestination';
import {formatDownloadBytes} from '../../lib/downloadFormatting';
import {getDownloadedVideoThumbnail} from '../../lib/downloadThumbnailCache';
import {
  createDownloadDirectoryName,
  createDownloadSeasonDirectoryName,
} from '../../lib/downloadId';
import {
  groupCompletedDownloads,
  sortDownloadedEpisodes,
} from '../../lib/downloadLibrary';
import type {DownloadItem} from '../../lib/zustand/downloadsStore';
import useDownloadsStore, {
  selectCompletedDownloads,
} from '../../lib/zustand/downloadsStore';
import {useM3Colors} from '../../theme/M3PaletteContext';

type DownloadedDetailsProps = CompositeScreenProps<
  NativeStackScreenProps<DownloadsStackParamList, 'DownloadedDetails'>,
  NativeStackScreenProps<RootStackParamList>
>;

const getSeasonTitle = (item: DownloadItem): string =>
  item.seasonTitle || 'Downloaded';

const DownloadedItemThumbnail = ({item}: {item: DownloadItem}) => {
  const colors = useM3Colors();
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setThumbnailUri(null);
    getDownloadedVideoThumbnail(item.filePath)
      .then(uri => {
        if (active) setThumbnailUri(uri);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [item.filePath]);

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: colors.secondaryContainer,
        borderRadius: 12,
        height: 45,
        justifyContent: 'center',
        overflow: 'hidden',
        width: 80,
      }}>
      {thumbnailUri ? (
        <Image
          source={{uri: thumbnailUri}}
          resizeMode="cover"
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
          }}
        />
      ) : null}
      <Ionicons name="play" size={18} color="#ffffff" />
    </View>
  );
};

const DownloadedDetails = ({navigation, route}: DownloadedDetailsProps) => {
  const colors = useM3Colors();
  const primary = colors.primary;
  const completed = useDownloadsStore(selectCompletedDownloads);
  const markMissing = useDownloadsStore(state => state.markMissing);
  const removeDownload = useDownloadsStore(state => state.removeDownload);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DownloadItem | null>(null);
  const group = useMemo(
    () =>
      groupCompletedDownloads(completed).find(
        item => item.id === route.params.groupId,
      ),
    [completed, route.params.groupId],
  );
  const seasons = useMemo(
    () => [...new Set(group?.items.map(getSeasonTitle) || [])],
    [group],
  );
  const seasonOptions = useMemo(
    () => seasons.map(title => ({title})),
    [seasons],
  );
  const [selectedSeason, setSelectedSeason] = useState<string | undefined>(
    seasons[0],
  );
  useEffect(() => {
    if (!selectedSeason || !seasons.includes(selectedSeason)) {
      setSelectedSeason(seasons[0]);
    }
  }, [seasons, selectedSeason]);
  const items = useMemo(() => {
    if (!group) {
      return [];
    }
    return sortDownloadedEpisodes(
      group.items.filter(item => getSeasonTitle(item) === selectedSeason),
    );
  }, [group, selectedSeason]);

  if (!group) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-center text-white/70">
          This downloaded title is no longer available.
        </Text>
        <TouchableOpacity
          className="mt-5 px-6 py-3"
          style={{backgroundColor: primary}}
          onPress={() => navigation.goBack()}>
          <Text className="font-semibold" style={{color: colors.onPrimary}}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const metadata = group.items[0];
  const totalBytes = group.items.reduce(
    (total, item) => total + item.totalBytes,
    0,
  );

  const playItem = async (item: DownloadItem) => {
    if (!(await downloadOutputExists(item.filePath))) {
      markMissing(item.id);
      return;
    }
    const playableItems = items.filter(
      candidate => candidate.status === 'completed',
    );
    navigation.navigate('Player', {
      episodeList: playableItems.map(candidate => ({
        id: candidate.id,
        title: candidate.episodeName || candidate.title,
        link: candidate.filePath,
        sourceLink: candidate.sourceLink,
      })),
      linkIndex: playableItems.findIndex(candidate => candidate.id === item.id),
      type: '',
      directUrl: item.filePath,
      primaryTitle: group.title,
      secondaryTitle: item.seasonTitle,
      poster: {
        poster: metadata.poster,
        background: metadata.background,
      },
      providerValue: item.provider || metadata.provider || 'airflix',
      infoUrl: item.infoUrl || metadata.infoUrl,
    });
  };

  const deleteItem = async (item: DownloadItem) => {
    if (deletingId) {
      return;
    }
    setDeletingId(item.id);
    try {
      const deleted = await deleteDownloadOutput(item.filePath, {
        downloadLocation: item.downloadLocation,
        outputDirectoryNames: [
          createDownloadDirectoryName(item.showName || item.title),
          ...[createDownloadSeasonDirectoryName(item.seasonTitle)].filter(
            (name): name is string => Boolean(name),
          ),
        ],
      });
      if (deleted || !(await downloadOutputExists(item.filePath))) {
        removeDownload(item.id);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const backgroundImage =
    metadata.background ||
    metadata.poster ||
    'https://placehold.jp/24/171717/ffffff/800x450.png?text=Airflix';

  return (
    <View className="h-full w-full bg-black">
      <StatusBar translucent backgroundColor="transparent" />
      <View className="absolute h-[340px] w-full">
        <Image
          source={{uri: backgroundImage}}
          className="h-[340px] w-full"
          resizeMode="cover"
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="relative h-[340px] w-full">
          <LinearGradient
            colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.18)', '#000000']}
            locations={[0, 0.55, 1]}
            className="absolute h-full w-full"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="ml-5 mt-14 h-12 w-12 items-center justify-center"
            style={({pressed}) => ({
              backgroundColor: pressed
                ? colors.secondaryContainer
                : 'rgba(23,23,23,0.88)',
              borderRadius: 18,
            })}
            onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={26}
              color={colors.onSurface}
            />
          </Pressable>
          <View className="absolute bottom-3 right-0 w-full px-5">
            <Text
              className="text-3xl font-bold capitalize"
              style={{color: colors.onBackground}}>
              {group.title}
            </Text>
            <View className="mt-3 flex-row items-center">
              <MaterialCommunityIcons
                name="download-circle-outline"
                size={18}
                color={colors.primary}
              />
              <Text
                className="ml-2 text-sm font-medium"
                style={{color: colors.onSurfaceVariant}}>
                {`${group.items.length} download${
                  group.items.length === 1 ? '' : 's'
                }`}
                {'  '}·{'  '}
                {formatDownloadBytes(totalBytes)}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-black px-5 pb-6 pt-3">
          {metadata.synopsis ? (
            <View className="mb-7">
              <Text
                className="mb-2 text-xl font-bold"
                style={{color: colors.onBackground}}>
                Synopsis
              </Text>
              <Text
                className="text-base leading-6"
                style={{color: colors.onSurfaceVariant}}>
                {metadata.synopsis}
              </Text>
            </View>
          ) : null}

          {seasonOptions.length > 0 ? (
            <DropdownField
              options={seasonOptions}
              value={seasonOptions.find(
                option => option.title === selectedSeason,
              )}
              getKey={option => option.title}
              getLabel={option => option.title}
              onChange={option => setSelectedSeason(option.title)}
            />
          ) : null}

          <Text
            className="mb-3 mt-7 text-xl font-bold"
            style={{color: colors.onBackground}}>
            Ready to watch
          </Text>
          {items.map((item, index) => (
            <View
              key={item.id}
              className="mb-3 w-full flex-row items-stretch gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Play ${item.episodeName || item.title}`}
                className="h-16 flex-1 flex-row items-center px-4"
                style={({pressed}) => ({
                  backgroundColor: pressed
                    ? colors.surfaceBright
                    : colors.surfaceContainerHigh,
                  borderColor: colors.outlineVariant,
                  borderRadius: 20,
                  borderWidth: 1,
                })}
                onPress={() => playItem(item)}>
                <DownloadedItemThumbnail item={item} />
                <View className="ml-3 flex-1">
                  <Text
                    className="font-semibold"
                    style={{color: colors.onSurface}}
                    numberOfLines={1}>
                    {item.episodeName || item.title}
                  </Text>
                  <Text
                    className="mt-1 text-xs"
                    style={{color: colors.onSurfaceVariant}}>
                    {items.length > 1 ? `Episode ${index + 1}  ·  ` : ''}
                    {formatDownloadBytes(item.totalBytes)}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
              <Pressable
                accessibilityLabel={`Delete ${item.episodeName || item.title}`}
                accessibilityRole="button"
                className="h-16 w-16 items-center justify-center"
                disabled={deletingId !== null}
                style={({pressed}) => ({
                  backgroundColor: pressed
                    ? colors.error
                    : colors.errorContainer,
                  borderRadius: 20,
                  opacity: deletingId && deletingId !== item.id ? 0.45 : 1,
                })}
                onPress={() => setPendingDelete(item)}>
                {deletingId === item.id ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.onErrorContainer}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={26}
                    color={colors.onErrorContainer}
                  />
                )}
              </Pressable>
            </View>
          ))}
        </View>
        <View className="h-16" />
      </ScrollView>
      <AppDialog
        visible={pendingDelete !== null}
        title="Delete download?"
        message={`Remove ${pendingDelete?.episodeName || pendingDelete?.title || 'this download'} from your device?`}
        primary={primary}
        variant="warning"
        actions={[
          {label: 'Cancel'},
          {
            label: 'Delete',
            variant: 'destructive',
            onPress: () => {
              const item = pendingDelete;
              setPendingDelete(null);
              if (item) {
                deleteItem(item);
              }
            },
          },
        ]}
        onDismiss={() => setPendingDelete(null)}
      />
    </View>
  );
};

export default DownloadedDetails;
