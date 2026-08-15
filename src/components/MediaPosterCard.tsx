import React from 'react';
import {Image, Pressable, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {useM3Colors} from '../theme/M3PaletteContext';
import AppText from './ui/Text';

interface MediaPosterCardProps {
  title: string;
  poster?: string;
  width: number;
  subtitle?: string;
  onPress: () => void;
  onLongPress?: () => void;
}

const MediaPosterCard = ({
  title,
  poster,
  width,
  subtitle,
  onPress,
  onLongPress,
}: MediaPosterCardProps) => {
  const colors = useM3Colors();

  return (
    <Animated.View entering={FadeInDown.duration(280)} style={{width}}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={450}
        style={({pressed}) => ({
          opacity: pressed ? 0.86 : 1,
          transform: [{scale: pressed ? 0.96 : 1}],
        })}>
        <View
          style={{
            backgroundColor: colors.surfaceContainerHigh,
            borderRadius: 20,
            overflow: 'hidden',
            width,
          }}>
          {poster ? (
            <Image
              source={{uri: poster}}
              resizeMode="cover"
              style={{aspectRatio: 2 / 3, width}}
            />
          ) : (
            <View
              style={{
                alignItems: 'center',
                aspectRatio: 2 / 3,
                backgroundColor: colors.surfaceContainerHighest,
                justifyContent: 'center',
                width,
              }}>
              <AppText
                role="headlineMediumEmphasized"
                style={{color: colors.onSurfaceVariant}}>
                {title.slice(0, 1).toUpperCase()}
              </AppText>
            </View>
          )}
        </View>
        <AppText
          role="labelMediumEmphasized"
          ellipsizeMode="tail"
          numberOfLines={1}
          style={{color: colors.onSurface, marginTop: 7}}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText
            role="labelSmall"
            ellipsizeMode="tail"
            numberOfLines={1}
            style={{color: colors.onSurfaceVariant, marginTop: 1}}>
            {subtitle}
          </AppText>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

export default MediaPosterCard;
