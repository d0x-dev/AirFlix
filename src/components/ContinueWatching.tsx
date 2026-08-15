import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, View} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import type {HomeStackParamList} from '../App';
import {useImageAccent} from '../lib/hooks/useImageAccent';
import {settingsStorage} from '../lib/storage';
import useContinueWatchingStore, {
  type ContinueWatchingItem,
} from '../lib/zustand/continueWatchingStore';
import {useM3Colors} from '../theme/M3PaletteContext';
import AppDialog from './AppDialog';
import MediaPosterCard from './MediaPosterCard';
import AppText from './ui/Text';

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
  onOpen: (item: ContinueWatchingItem) => void;
  onRemove: (item: ContinueWatchingItem) => void;
}

const ContinueWatchingCard = ({
  item,
  onOpen,
  onRemove,
}: ContinueWatchingCardProps) => {
  const colors = useM3Colors();
  const poster = item.poster || item.background;
  const episodeTitle =
    item.episodeTitle ||
    (item.episode?.title && item.episode.title !== item.title
      ? item.episode.title
      : undefined);
  const progressColor = useImageAccent(poster, colors.primary);
  const progress =
    item.duration > 0
      ? Math.min(100, Math.max(0, (item.position / item.duration) * 100))
      : 0;

  return (
    <View style={{width: 124}}>
      <MediaPosterCard
        title={item.title}
        subtitle={episodeTitle}
        poster={poster}
        width={124}
        onPress={() => onOpen(item)}
        onLongPress={() => onRemove(item)}
      />
      <View
        style={{
          backgroundColor: colors.surfaceContainerHighest,
          borderRadius: 2,
          height: 3,
          marginTop: 7,
          overflow: 'hidden',
        }}>
        <View
          style={{
            backgroundColor: progressColor,
            height: 3,
            width: `${progress}%`,
          }}
        />
      </View>
    </View>
  );
};

const ContinueWatching = () => {
  const colors = useM3Colors();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const storedItems = useContinueWatchingStore(state => state.items);
  const removeItem = useContinueWatchingStore(state => state.removeItem);
  const [itemToRemove, setItemToRemove] = useState<ContinueWatchingItem | null>(
    null,
  );
  const items = useMemo(
    () =>
      storedItems
        .filter(
          (item): item is ContinueWatchingItem => Boolean(item.providerValue),
        )
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [storedItems],
  );

  const openInfo = useCallback(
    (item: ContinueWatchingItem) => {
      navigation.navigate('Info', {
        link: item.infoUrl,
        provider: item.providerValue,
        poster: item.poster || item.background,
      });
    },
    [navigation],
  );

  const removeContinueWatchingItem = useCallback(
    (item: ContinueWatchingItem) => {
      if (settingsStorage.isHapticFeedbackEnabled()) {
        ReactNativeHapticFeedback.trigger('effectHeavyClick', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
      setItemToRemove(item);
    },
    [],
  );

  const confirmRemove = useCallback(() => {
    if (itemToRemove) {
      removeItem(itemToRemove.id);
    }
  }, [itemToRemove, removeItem]);

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={{gap: 14, marginTop: 28}}>
      <AppText
        role="titleLargeEmphasized"
        style={{color: colors.onBackground, paddingHorizontal: 20}}>
        Continue watching
      </AppText>
      <FlatList
        horizontal
        data={items}
        keyExtractor={item => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: 20}}
        ItemSeparatorComponent={() => <View style={{width: 14}} />}
        renderItem={({item}) => (
          <ContinueWatchingCard
            item={item}
            onOpen={openInfo}
            onRemove={removeContinueWatchingItem}
          />
        )}
      />
      <AppDialog
        visible={itemToRemove !== null}
        title="Remove"
        message={
          itemToRemove
            ? `Remove ${itemToRemove.title} from Continue watching?`
            : ''
        }
        primary="Remove"
        variant="warning"
        onDismiss={() => setItemToRemove(null)}
        actions={[
          {label: 'Cancel'},
          {
            label: 'Remove',
            onPress: confirmRemove,
            variant: 'destructive',
          },
        ]}
      />
    </View>
  );
};

export default ContinueWatching;
