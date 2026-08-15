import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import React from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {BlurView} from 'expo-blur';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {settingsStorage} from '../../lib/storage';
import {useM3Colors} from '../../theme/M3PaletteContext';
import useThemeStore from '../../lib/zustand/themeStore';
import AppText from '../ui/Text';
import {AnimatedTabIcon, type AnimatedTabIconName} from './AnimatedTabIcon';

const TAB_ICONS: Record<string, AnimatedTabIconName> = {
  HomeStack: 'home',
  SearchStack: 'search',
  WatchListStack: 'watchlist',
  DownloadsStack: 'download',
  SettingsStack: 'settings',
};

const StreamingTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  const colors = useM3Colors();
  const insets = useSafeAreaInsets();
  const {width: windowWidth} = useWindowDimensions();
  const isNavigationRail = windowWidth > 768;
  const isPureBlack = useThemeStore(state => state.isPureBlack);
  const showLabels = settingsStorage.showTabBarLabels();
  const bottomBarPadding =
    Platform.OS === 'android'
      ? Math.min(Math.max(insets.bottom, 8), 20)
      : Math.max(insets.bottom, 8);

  return (
    <BlurView
      intensity={100}
      tint="dark"
      style={{
        position: isNavigationRail ? 'relative' : 'absolute',
        bottom: isNavigationRail ? 0 : bottomBarPadding,
        left: isNavigationRail ? 0 : 20,
        right: isNavigationRail ? 0 : 20,
        backgroundColor: isPureBlack ? 'rgba(0,0,0,0.85)' : `${colors.surfaceContainerHigh}D9`,
        borderTopWidth: 0,
        borderRightColor: isNavigationRail ? colors.outlineVariant : undefined,
        borderRightWidth: isNavigationRail ? StyleSheet.hairlineWidth : 0,
        borderRadius: isNavigationRail ? 0 : 32,
        overflow: 'hidden',
        height: isNavigationRail ? '100%' : undefined,
        paddingBottom: isNavigationRail
          ? Math.max(insets.bottom, 12)
          : 6,
        paddingLeft: isNavigationRail ? insets.left : 4,
        paddingRight: 4,
        paddingTop: isNavigationRail ? Math.max(insets.top, 16) : 6,
        width: isNavigationRail ? 96 + insets.left : undefined,
      }}>
      <View
        style={{
          alignItems: isNavigationRail ? 'center' : undefined,
          flex: isNavigationRail ? 1 : undefined,
          flexDirection: isNavigationRail ? 'column' : 'row',
          gap: isNavigationRail ? 8 : undefined,
          height: isNavigationRail ? undefined : showLabels ? 58 : 42,
        }}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof descriptor.options.tabBarLabel === 'string'
              ? descriptor.options.tabBarLabel
              : typeof descriptor.options.title === 'string'
                ? descriptor.options.title
                : route.name;
          const icon = TAB_ICONS[route.name] ?? 'home';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              if (settingsStorage.isHapticFeedbackEnabled()) {
                ReactNativeHapticFeedback.trigger('effectTick', {
                  enableVibrateFallback: true,
                  ignoreAndroidSystemSettings: false,
                });
              }
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? {selected: true} : {}}
              accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
              activeOpacity={0.8}
              onLongPress={() =>
                navigation.emit({type: 'tabLongPress', target: route.key})
              }
              onPress={onPress}
              style={{
                alignItems: 'center',
                flex: isNavigationRail ? undefined : 1,
                height: isNavigationRail
                  ? showLabels
                    ? 72
                    : 56
                  : showLabels
                    ? 58
                    : 42,
                justifyContent: 'center',
                minWidth: 48,
                width: isNavigationRail ? 88 : undefined,
              }}>
              <View
                pointerEvents="none"
                style={{
                  alignItems: 'center',
                  backgroundColor: focused
                    ? colors.secondaryContainer
                    : 'transparent',
                  borderRadius: 14,
                  height: 28,
                  justifyContent: 'center',
                  overflow: 'hidden',
                  width: 50,
                }}>
                <AnimatedTabIcon
                  name={icon}
                  active={focused}
                  color={
                    focused
                      ? colors.onSecondaryContainer
                      : colors.onSurfaceVariant
                  }
                  size={22}
                />
              </View>
              {showLabels ? (
                <AppText
                  role={focused ? 'labelMediumEmphasized' : 'labelMedium'}
                  numberOfLines={1}
                  style={{
                    color: focused ? colors.onSurface : colors.onSurfaceVariant,
                    marginTop: 4,
                    textAlign: 'center',
                  }}>
                  {label}
                </AppText>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </BlurView>
  );
};

export default StreamingTabBar;
