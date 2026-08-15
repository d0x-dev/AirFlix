import {
  DevSettings,
  ToastAndroid,
  View,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import React, {useCallback} from 'react';
import {
  settingsStorage,
  clearAllMMKVStorage,
} from '../../lib/storage';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { BlurView } from 'expo-blur';
import {
  NativeStackScreenProps,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {SettingsStackParamList, TabStackParamList} from '../../App';
import {MaterialIcons, Ionicons} from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  interpolateColor,
} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import useNavigationPreferencesStore from '../../lib/zustand/navigationPreferencesStore';
import GitHubStarButton from './components/GitHubStarButton';
import DnsPreference from './components/DnsPreference';
import IconButton from '../../components/ui/IconButton';
import SettingsRow from '../../components/ui/SettingsRow';
import SettingsSection from '../../components/ui/SettingsSection';
import AppText from '../../components/ui/Text';
import {useM3Colors} from '../../theme/M3PaletteContext';
import {showAppDialog} from '../../lib/zustand/appDialogStore';
import {clearAppCache} from '../../lib/clearAppCache';
import SquareSettingsCard from '../../components/ui/SquareSettingsCard';
import AmbientBackground from '../../components/ui/AmbientBackground';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Settings'>;

const Settings = ({navigation}: Props) => {
  const colors = useM3Colors();
  const hideDownloadsTab = useNavigationPreferencesStore(
    state => state.hideDownloadsTab,
  );

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

  const clearCacheHandler = useCallback(async () => {
    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('virtualKey', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }
    await clearAppCache();
    ToastAndroid.show('App cache cleared', ToastAndroid.SHORT);
  }, []);

  const eraseAllLocalData = useCallback(async () => {
    clearAllMMKVStorage();
    if (Updates.isEnabled) {
      await Updates.reloadAsync();
      return;
    }
    DevSettings.reload('All MMKV storage erased');
  }, []);

  const confirmEraseAllLocalData = useCallback(() => {
    showAppDialog({
      title: 'Erase all local data?',
      message:
        'This permanently erases every Airflix MMKV store, including settings, installed provider data, Watchlist, Continue watching, download records, and cached state. This cannot be undone. Downloaded media files on disk are not deleted.',
      variant: 'error',
      actions: [
        {label: 'Cancel'},
        {
          label: 'Erase everything',
          variant: 'destructive',
          onPress: eraseAllLocalData,
        },
      ],
    });
  }, [eraseAllLocalData]);

  const AnimatedSection = ({
    delay,
    children,
  }: {
    delay: number;
    children: React.ReactNode;
  }) => (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      layout={Layout.springify()}>
      {children}
    </Animated.View>
  );

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
          <Animated.Text style={[{ color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginLeft: 20 }, headerTextStyle]}>
            Settings
          </Animated.Text>
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
          <AppText role="headlineLarge" style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 34 }}>
            Settings
          </AppText>
        </View>

        <View className="px-5">
          {/* Profile Header Card */}
          <AnimatedSection delay={50}>
            <View
              style={{
                backgroundColor: '#232427', // Silver card
                borderRadius: 24,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20,
              }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: '#383a40',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                }}>
                <Image source={{ uri: 'airflix_vector' }} style={{ width: 40, height: 40, tintColor: '#a5c0ff' }} resizeMode="contain" />
              </View>
              <View className="justify-center">
                <AppText role="titleLarge" style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 22 }}>
                  Airflix
                </AppText>
                <View
                  style={{
                    backgroundColor: '#383a40',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    alignSelf: 'flex-start',
                    marginTop: 6,
                  }}>
                  <AppText
                    role="labelSmall"
                    style={{color: '#a5c0ff', fontWeight: 'bold'}}>
                    v{Constants.expoConfig?.version || '1.0.0'}
                  </AppText>
                </View>
              </View>
            </View>
          </AnimatedSection>

          {/* 2x2 Grid */}
          <AnimatedSection delay={100}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <SquareSettingsCard
                title="Provider Manager"
                icon="puzzle-outline"
                onPress={() => navigation.navigate('Extensions')}
              />
              <SquareSettingsCard
                title="Appearance"
                icon="palette-outline"
                onPress={() => navigation.navigate('Appearance')}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <SquareSettingsCard
                title="Subtitle Style"
                icon="subtitles-outline"
                onPress={() => navigation.navigate('SubTitlesPreferences')}
              />
              <SquareSettingsCard
                title="Preferences"
                icon="tune-variant"
                onPress={() => navigation.navigate('Preferences')}
              />
            </View>
          </AnimatedSection>

          {/* User Interface Section (duplicate items) */}
          <AnimatedSection delay={150}>
            <SettingsSection title="User Interface">
              <SettingsRow
                title="Appearance"
                description="Dark theme"
                icon="palette-outline"
                onPress={() => navigation.navigate('Appearance')}
              />
              <SettingsRow
                title="Provider Manager"
                description="Manage extensions"
                icon="puzzle-outline"
                onPress={() => navigation.navigate('Extensions')}
              />
              <SettingsRow
                title="Subtitle Style"
                description="Customize captions"
                icon="subtitles-outline"
                onPress={() => navigation.navigate('SubTitlesPreferences')}
              />
              <SettingsRow
                title="Preferences"
                icon="tune-variant"
                divider={false}
                onPress={() => navigation.navigate('Preferences')}
              />
            </SettingsSection>
          </AnimatedSection>

          {/* Network Section */}
          <AnimatedSection delay={200}>
            <SettingsSection title="Network">
              <DnsPreference />
            </SettingsSection>
          </AnimatedSection>

          {/* Options Section */}
          <AnimatedSection delay={250}>
            {hideDownloadsTab && (
              <SettingsSection title="Downloads">
                <SettingsRow
                  title="Downloads"
                  icon="download-circle-outline"
                  divider={false}
                  onPress={() => navigation.navigate('DownloadsStack')}
                />
              </SettingsSection>
            )}
          </AnimatedSection>

          {/* Data Management section */}
          <AnimatedSection delay={300}>
            <SettingsSection title="Data Management">
              <SettingsRow
                title="Clear Cache"
                trailing={
                  <IconButton
                    icon="delete-outline"
                    label="Clear cache"
                    onPress={clearCacheHandler}
                  />
                }
              />
              <SettingsRow
                title="Erase all local data"
                description="Erase all local data"
                icon="delete-alert-outline"
                divider={false}
                onPress={confirmEraseAllLocalData}
              />
            </SettingsSection>
          </AnimatedSection>

          {/* About & GitHub section */}
          <AnimatedSection delay={400}>
            <SettingsSection title="About">
              <SettingsRow
                title="About Airflix"
                icon="information-outline"
                onPress={() => navigation.navigate('About')}
              />
              <GitHubStarButton primary={colors.primary} />
            </SettingsSection>
          </AnimatedSection>
        </View>
      </Animated.ScrollView>
    </View>
    </AmbientBackground>
  );
};

export default Settings;

