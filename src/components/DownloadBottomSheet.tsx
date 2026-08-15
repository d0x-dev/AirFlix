import {
  Text,
  TouchableOpacity,
  Dimensions,
  ToastAndroid,
  View,
} from 'react-native';
import React, {useEffect, useRef} from 'react';
import {Stream} from '../lib/providers/types';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetView,
} from '@expo/ui/community/bottom-sheet';
import SkeletonLoader from './Skeleton';
import RNReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {Clipboard} from 'react-native';
import {TextTrackType} from 'react-native-video';
import {settingsStorage} from '../lib/storage';
import {useM3Colors} from '../theme/M3PaletteContext';

type Props = {
  data: Stream[];
  loading: boolean;
  title: string;
  showModal: boolean;
  setModal: (value: boolean) => void;
  onPressVideo: (item: any) => void;
  onPressSubs: (item: any) => void;
  error?: string | null;
};
const DownloadBottomSheet = ({
  data,
  loading,
  showModal,
  setModal,
  title,
  onPressSubs,
  onPressVideo,
  error,
}: Props) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colors = useM3Colors();
  const [activeTab, setActiveTab] = React.useState<1 | 2>(1);
  const streams = Array.isArray(data) ? data : [];

  const subtitle = streams.map(server => {
    if (server.subtitles && server.subtitles.length > 0) {
      return server.subtitles;
    }
  });
  useEffect(() => {
    if (showModal) {
      bottomSheetRef.current?.expand?.();
    } else {
      bottomSheetRef.current?.close?.();
    }
  }, [showModal]);
  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      enablePanDownToClose
      enableDynamicSizing={false}
      snapPoints={['55%', '82%']}
      backgroundStyle={{backgroundColor: colors.surfaceContainerLow}}
      handleIndicatorStyle={{backgroundColor: colors.outline}}
      onClose={() => setModal(false)}>
      <BottomSheetView
        style={{
          backgroundColor: colors.surfaceContainerLow,
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 8,
        }}>
        <Text
          style={{
            color: colors.onSurface,
            fontSize: 20,
            fontWeight: '700',
            textAlign: 'center',
          }}>
          {title}
        </Text>
        <View
          style={{
            alignSelf: 'center',
            backgroundColor: colors.surfaceContainerHigh,
            borderRadius: 20,
            flexDirection: 'row',
            marginVertical: 16,
            padding: 4,
          }}>
          {subtitle && subtitle.length > 0 && subtitle[0] !== undefined ? (
            [
              {label: 'Video', value: 1 as const},
              {label: 'Subtitle', value: 2 as const},
            ].map(tab => {
              const selected = activeTab === tab.value;
              return (
                <TouchableOpacity
                  key={tab.value}
                  onPress={() => setActiveTab(tab.value)}
                  style={{
                    backgroundColor: selected
                      ? colors.secondaryContainer
                      : 'transparent',
                    borderRadius: 16,
                    paddingHorizontal: 20,
                    paddingVertical: 9,
                  }}>
                  <Text
                    style={{
                      color: selected
                        ? colors.onSecondaryContainer
                        : colors.onSurfaceVariant,
                      fontWeight: selected ? '700' : '500',
                    }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <View />
          )}
        </View>
        <BottomSheetScrollView
          contentContainerStyle={{paddingBottom: 28}}
          showsVerticalScrollIndicator={false}>
          {loading
            ? Array.from({length: 4}).map((_, index) => (
                <SkeletonLoader
                  key={index}
                  width={Dimensions.get('window').width - 30}
                  height={35}
                  marginVertical={5}
                  baseColor={colors.surfaceContainerHigh}
                  highlightColor={colors.surfaceContainerHighest}
                  style={{borderRadius: 12}}
                />
              ))
            : activeTab === 1
              ? streams.map(item => (
                  <TouchableOpacity
                    key={item.link}
                    activeOpacity={0.72}
                    style={{
                      backgroundColor: colors.surfaceContainerHigh,
                      alignItems: 'center',
                      borderColor: colors.outlineVariant,
                      borderRadius: 16,
                      borderWidth: 1,
                      flexDirection: 'row',
                      gap: 12,
                      justifyContent: 'space-between',
                      marginVertical: 5,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                    }}
                    onLongPress={() => {
                      if (settingsStorage.isHapticFeedbackEnabled()) {
                        RNReactNativeHapticFeedback.trigger('effectTick', {
                          enableVibrateFallback: true,
                          ignoreAndroidSystemSettings: false,
                        });
                      }
                      Clipboard.setString(item.link);
                      ToastAndroid.show('Link copied', ToastAndroid.SHORT);
                    }}
                    onPress={() => {
                      onPressVideo(item);
                      bottomSheetRef.current?.close?.();
                    }}>
                    <Text
                      style={{
                        color: colors.onSurface,
                        flex: 1,
                        fontWeight: '600',
                      }}>
                      {item.server}
                    </Text>
                    {item.quality ? (
                      <View
                        style={{
                          backgroundColor: colors.secondaryContainer,
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}>
                        <Text
                          style={{
                            color: colors.onSecondaryContainer,
                            fontSize: 12,
                            fontWeight: '700',
                          }}>
                          {item.quality.toLowerCase().endsWith('p')
                            ? item.quality
                            : `${item.quality}p`}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))
              : subtitle.length > 0
                ? subtitle.map(subs =>
                    subs?.map(item => (
                      <TouchableOpacity
                        key={item.uri}
                        activeOpacity={0.72}
                        style={{
                          backgroundColor: colors.surfaceContainerHigh,
                          borderColor: colors.outlineVariant,
                          borderRadius: 16,
                          borderWidth: 1,
                          marginVertical: 5,
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                        }}
                        onLongPress={() => {
                          if (settingsStorage.isHapticFeedbackEnabled()) {
                            RNReactNativeHapticFeedback.trigger('effectTick', {
                              enableVibrateFallback: true,
                              ignoreAndroidSystemSettings: false,
                            });
                          }
                          Clipboard.setString(item.uri);
                          ToastAndroid.show('Link copied', ToastAndroid.SHORT);
                        }}
                        onPress={() => {
                          onPressSubs({
                            server: 'Subtitles',
                            link: item.uri,
                            type:
                              item.type === TextTrackType.VTT ? 'vtt' : 'srt',
                            title: item.title,
                          });
                          bottomSheetRef.current?.close?.();
                        }}>
                        <Text style={{color: colors.onSurface}}>
                          {item.language}
                          {' - '} {item.title}
                        </Text>
                      </TouchableOpacity>
                    )),
                  )
                : null}
          {streams.length === 0 && !loading && (
            <Text
              style={{
                color: colors.error,
                fontSize: 18,
                textAlign: 'center',
              }}>
              {error || 'No server found'}
            </Text>
          )}
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default DownloadBottomSheet;
