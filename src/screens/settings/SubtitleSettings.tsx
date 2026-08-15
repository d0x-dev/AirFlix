import {AnimatedAppText} from '../../components/ui/Text';
import {View, Pressable, Platform, StatusBar} from 'react-native';
import React from 'react';
import {useNavigation} from '@react-navigation/native';
import Animated, {
  FadeInUp,
  Layout,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  interpolateColor,
} from 'react-native-reanimated';
import {Ionicons} from '@expo/vector-icons';
import {startActivityAsync, ActivityAction} from 'expo-intent-launcher';
import {settingsStorage} from '../../lib/storage';
import IconButton from '../../components/ui/IconButton';
import SettingsRow from '../../components/ui/SettingsRow';
import SettingsSection from '../../components/ui/SettingsSection';
import AppText from '../../components/ui/Text';
import AmbientBackground from '../../components/ui/AmbientBackground';

const SubtitlePreference = () => {
  const navigation = useNavigation();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerTextStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [30, 60], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollY.value, [30, 60], [10, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const headerContainerStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        scrollY.value,
        [30, 60],
        ['transparent', '#000000']
      ),
    };
  });

  const [fontSize, setFontSize] = React.useState(
    settingsStorage.getSubtitleFontSize(),
  );
  const [opacity, setOpacity] = React.useState(
    settingsStorage.getSubtitleOpacity(),
  );
  const [bottomElevation, setBottomElevation] = React.useState(
    settingsStorage.getSubtitleBottomPadding(),
  );
  const handleSubtitleSize = (action: 'increase' | 'decrease') => {
    if (fontSize < 5 || fontSize > 30) return;
    if (action === 'increase') {
      const newSize = Math.min(fontSize + 1, 30);
      settingsStorage.setSubtitleFontSize(newSize);
      setFontSize(newSize);
    }
    if (action === 'decrease') {
      const newSize = Math.max(fontSize - 1, 10);
      settingsStorage.setSubtitleFontSize(newSize);
      setFontSize(newSize);
    }
  };

  const handleSubtitleOpacity = (action: 'increase' | 'decrease') => {
    if (action === 'increase') {
      const newOpacity = Math.min(opacity + 0.1, 1).toFixed(1);
      settingsStorage.setSubtitleOpacity(parseFloat(newOpacity));
      setOpacity(parseFloat(newOpacity));
    }
    if (action === 'decrease') {
      const newOpacity = Math.max(opacity - 0.1, 0).toFixed(1);
      settingsStorage.setSubtitleOpacity(parseFloat(newOpacity));
      setOpacity(parseFloat(newOpacity));
    }
  };

  const handleSubtitleBottomPadding = (action: 'increase' | 'decrease') => {
    if (bottomElevation < 0 || bottomElevation > 99) return;
    if (action === 'increase') {
      const newPadding = Math.min(bottomElevation + 1, 99);
      settingsStorage.setSubtitleBottomPadding(newPadding);
      setBottomElevation(newPadding);
    }
    if (action === 'decrease') {
      const newPadding = Math.max(bottomElevation - 1, 0);
      settingsStorage.setSubtitleBottomPadding(newPadding);
      setBottomElevation(newPadding);
    }
  };

  return (
    <AmbientBackground>
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        
        {/* Sticky Top Header Bar */}
        <Animated.View 
          style={[{ 
            position: 'absolute', top: 0, left: 0, right: 0, 
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 20, 
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 5 : 45,
            paddingBottom: 15,
            zIndex: 10,
          }, headerContainerStyle]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => navigation.goBack()} style={({pressed}) => ({ opacity: pressed ? 0.7 : 1, padding: 4, marginLeft: -4 })}>
              <Ionicons name="arrow-back" size={28} color="#ffffff" />
            </Pressable>
            <AnimatedAppText style={[{ color: '#ffffff', fontSize: 20, marginLeft: 20 }, headerTextStyle]}>
              Subtitle Style
            </AnimatedAppText>
          </View>
        </Animated.View>

        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          className="h-full w-full"
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
          entering={FadeInUp.springify()}
          layout={Layout.springify()}
          contentContainerStyle={{
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 85 : 120, // Push content down below the sticky bar
            paddingBottom: 120,
            flexGrow: 1,
          }}>
          
          {/* Large Scrolling Header */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24, marginTop: 10 }}>
            <AppText role="headlineLarge" style={{ color: '#ffffff', fontSize: 34 }}>
              Subtitle Style
            </AppText>
          </View>

          <View className="px-5">
        <SettingsSection title="Text">
          <SettingsRow
            title="Font size"
            description="Size in scaled pixels"
            trailing={
              <View className="flex-row items-center gap-2">
                <IconButton
                  icon="minus"
                  label="Decrease subtitle font size"
                  onPress={() => handleSubtitleSize('decrease')}
                />
                <AppText
                  role="titleMediumEmphasized"
                  className="w-10 text-center text-m3-on-surface">
                  {fontSize}
                </AppText>
                <IconButton
                  icon="plus"
                  label="Increase subtitle font size"
                  onPress={() => handleSubtitleSize('increase')}
                />
              </View>
            }
          />
          <SettingsRow
            title="Opacity"
            description="Subtitle background opacity"
            trailing={
              <View className="flex-row items-center gap-2">
                <IconButton
                  icon="minus"
                  label="Decrease subtitle opacity"
                  onPress={() => handleSubtitleOpacity('decrease')}
                />
                <AppText
                  role="titleMediumEmphasized"
                  className="w-10 text-center text-m3-on-surface">
                  {opacity}
                </AppText>
                <IconButton
                  icon="plus"
                  label="Increase subtitle opacity"
                  onPress={() => handleSubtitleOpacity('increase')}
                />
              </View>
            }
          />
          <SettingsRow
            title="Bottom elevation"
            description="Distance from the bottom edge"
            trailing={
              <View className="flex-row items-center gap-2">
                <IconButton
                  icon="minus"
                  label="Decrease subtitle bottom elevation"
                  onPress={() => handleSubtitleBottomPadding('decrease')}
                />
                <AppText
                  role="titleMediumEmphasized"
                  className="w-10 text-center text-m3-on-surface">
                  {bottomElevation}
                </AppText>
                <IconButton
                  icon="plus"
                  label="Increase subtitle bottom elevation"
                  onPress={() => handleSubtitleBottomPadding('increase')}
                />
              </View>
            }
          />
          <SettingsRow
            title="System caption settings"
            description="Open Android accessibility caption controls"
            icon="closed-caption-outline"
            onPress={async () => {
              await startActivityAsync(ActivityAction.CAPTIONING_SETTINGS);
            }}
          />
          <SettingsRow
            title="Reset to defaults"
            description="Font 16, full opacity, elevation 10"
            divider={false}
            trailing={
              <IconButton
                icon="restore"
                label="Reset subtitle preferences"
                onPress={() => {
                  settingsStorage.setSubtitleFontSize(16);
                  settingsStorage.setSubtitleOpacity(1);
                  settingsStorage.setSubtitleBottomPadding(10);
                  setFontSize(16);
                  setOpacity(1);
                  setBottomElevation(10);
                }}></IconButton>
            }
          />
        </SettingsSection>
      </View>
      </Animated.ScrollView>
      </View>
    </AmbientBackground>
  );
};

export default SubtitlePreference;

