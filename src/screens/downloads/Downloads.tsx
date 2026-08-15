import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {StatusBar} from 'expo-status-bar';
import React, {useCallback, useMemo} from 'react';
import {Dimensions, FlatList, Platform, View} from 'react-native';
import type {DownloadsStackParamList} from '../../App';
import MediaPosterCard from '../../components/MediaPosterCard';
import AppText from '../../components/ui/Text';
import {reconcileCompletedDownloadOutputs} from '../../lib/downloadReconciliation';
import {groupCompletedDownloads} from '../../lib/downloadLibrary';
import useDownloadsStore, {
  selectCompletedDownloads,
} from '../../lib/zustand/downloadsStore';
import {useM3Colors} from '../../theme/M3PaletteContext';
import AmbientBackground from '../../components/ui/AmbientBackground';
import CurrentDownloadsSection from '../settings/components/CurrentDownloadsSection';
import MissingDownloadsSection from '../settings/components/MissingDownloadsSection';

const GRID_PADDING = 12;
const GRID_GAP = 10;
const MIN_CARD_WIDTH = 100;

const Downloads = () => {
  const colors = useM3Colors();
  const navigation =
    useNavigation<NativeStackNavigationProp<DownloadsStackParamList>>();
  const completed = useDownloadsStore(selectCompletedDownloads);
  const groups = useMemo(() => groupCompletedDownloads(completed), [completed]);
  const availableWidth = Dimensions.get('window').width - GRID_PADDING * 2;
  const columns = Math.max(
    2,
    Math.floor((availableWidth + GRID_GAP) / (MIN_CARD_WIDTH + GRID_GAP)),
  );
  const cardWidth = (availableWidth - GRID_GAP * (columns - 1)) / columns;

  useFocusEffect(
    useCallback(() => {
      reconcileCompletedDownloadOutputs().catch(error =>
        console.warn('Download library reconciliation failed:', error),
      );
    }, []),
  );

  return (
    <AmbientBackground>
      <View className="flex-1">
        <StatusBar />
        <FlatList
          data={groups}
          key={columns}
          numColumns={columns}
          keyExtractor={item => item.id}
          columnWrapperStyle={{gap: GRID_GAP}}
        contentContainerStyle={{
          paddingHorizontal: GRID_PADDING,
          paddingTop: Platform.OS === 'android' ? 28 : 12,
          paddingBottom: 120,
        }}
        ListHeaderComponent={
          <View>
            <AppText
              role="headlineLargeEmphasized"
              className="mb-6 mt-2 text-center text-m3-on-background">
              Downloads
            </AppText>
            <CurrentDownloadsSection primary={colors.primary} />
            <MissingDownloadsSection primary={colors.primary} />
            {groups.length > 0 ? (
              <AppText
                role="titleLargeEmphasized"
                className="mb-4 text-m3-on-background">
                Downloaded
              </AppText>
            ) : null}
          </View>
        }
        renderItem={({item}) => (
          <MediaPosterCard
            title={item.title}
            poster={item.poster}
            width={cardWidth}
            subtitle={`${item.items.length} ${item.items.length === 1 ? 'Download' : 'Downloads'}`}
            onPress={() =>
              navigation.navigate('DownloadedDetails', {groupId: item.id})
            }
          />
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <MaterialCommunityIcons
              name="download-off-outline"
              size={72}
              color={colors.onSurfaceVariant}
            />
            <AppText
              role="bodyLarge"
              className="mt-4 text-center text-m3-on-surface-variant">
              Your downloaded library is empty
            </AppText>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
      </View>
    </AmbientBackground>
  );
};

export default Downloads;
