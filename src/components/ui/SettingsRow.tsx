import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, {ReactNode} from 'react';
import {Pressable, View, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import AppText from './Text';

interface SettingsRowProps {
  title: string;
  description?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress?: () => void;
  trailing?: ReactNode;
  divider?: boolean;
}

const SettingsRow = ({
  title,
  description,
  icon,
  onPress,
  trailing,
  divider = true,
}: SettingsRowProps) => {
  const scale = useSharedValue(1);
  
  const handlePressIn = () => {
    scale.value = withSpring(0.98, {damping: 20, stiffness: 300});
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1, {damping: 20, stiffness: 300});
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        disabled={!onPress}
        hitSlop={{top: 4, bottom: 4, left: 0, right: 0}}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={({pressed}) => ({
          backgroundColor: pressed 
            ? '#383a40' 
            : 'transparent',
        })}>
        <View className="flex-col">
          <View className="min-h-[72px] flex-row items-center px-4 py-3">
            {icon ? (
              <View
                className="mr-4 h-[42px] w-[42px] items-center justify-center"
                style={{
                  backgroundColor: '#383a40',
                  borderRadius: 16,
                }}>
                <MaterialCommunityIcons
                  name={icon}
                  size={24}
                  color="#d4d4d8"
                  pointerEvents="none"
                />
              </View>
            ) : null}
            <View className="mr-3 flex-1">
              <AppText role="bodyLarge" style={{ color: '#ffffff', fontWeight: '500' }}>
                {title}
              </AppText>
              {description ? (
               <AppText
                  role="bodySmall"
                  style={{ color: '#a0a0a0', marginTop: 4 }}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {description}
                </AppText>
              ) : null}
            </View>
            {trailing ??
              (onPress ? (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#a0a0a0"
                  pointerEvents="none"
                />
              ) : null)}
          </View>

          {divider && (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: '#383a40',
                marginLeft: icon ? 74 : 16, // Indent past the icon
              }}
            />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default SettingsRow;
