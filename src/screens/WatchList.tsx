import {View, Platform, Dimensions, FlatList} from 'react-native';
import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {WatchListStackParamList} from '../App';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import useWatchListStore from '../lib/zustand/watchListStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {StatusBar} from 'expo-status-bar';
import MediaPosterCard from '../components/MediaPosterCard';
import AppText from '../components/ui/Text';
import {useM3Colors} from '../theme/M3PaletteContext';
import type {WatchListItem} from '../lib/storage';
import AmbientBackground from '../components/ui/AmbientBackground';

const WatchList = () => {
  const colors = useM3Colors();
  const navigation =
    useNavigation<NativeStackNavigationProp<WatchListStackParamList>>();
  const watchList = useWatchListStore(state => state.watchList);

  // Calculate how many items can fit per row
  const screenWidth = Dimensions.get('window').width;
  const containerPadding = 12; // from the px-3 class (3*4=12)
  const itemSpacing = 10;

  // Available width for the grid
  const availableWidth = screenWidth - containerPadding * 2;

  // Determine number of columns and adjusted item width
  const numColumns = Math.floor(
    (availableWidth + itemSpacing) / (100 + itemSpacing),
  );

  // Calculate the actual item width to fill the space exactly
  const itemWidth =
    (availableWidth - itemSpacing * (numColumns - 1)) / numColumns;

  // Render each grid item
  const renderItem = ({item, index}: {item: WatchListItem; index: number}) => (
    <MediaPosterCard
      key={item.link + index}
      title={item.title}
      poster={item.poster}
      width={itemWidth}
      onPress={() =>
        navigation.navigate('Info', {
          link: item.link,
          provider: item.provider,
          poster: item.poster,
        })
      }
    />
  );

  return (
    <AmbientBackground>
      <View className="flex-1 items-center justify-center">
        <StatusBar />

        <View
          className="w-full"
          style={{
          paddingTop: Platform.OS === 'android' ? 15 : 0, // Adjust for Android status bar height
        }}
      />

      <View className="flex-1 w-full px-3">
        <AppText
          role="headlineLargeEmphasized"
          className="mb-6 mt-4 text-center text-m3-on-background">
          Watchlist
        </AppText>

        {watchList.length > 0 ? (
          <FlatList
            data={watchList}
            renderItem={renderItem}
            keyExtractor={(item, index) => item.link + index}
            numColumns={numColumns}
            columnWrapperStyle={{
              gap: itemSpacing,
              justifyContent: 'flex-start',
            }}
            contentContainerStyle={{
              paddingBottom: 120,
            }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1">
            <View className="items-center justify-center mt-20 mb-12">
              <MaterialCommunityIcons
                name="bookmark-off-outline"
                size={72}
                color={colors.onSurfaceVariant}
              />
              <AppText
                role="bodyLarge"
                className="mt-4 text-center text-m3-on-surface-variant">
                Your watchlist is empty
              </AppText>
            </View>
          </View>
        )}
      </View>
    </View>
    </AmbientBackground>
  );
};

export default WatchList;
