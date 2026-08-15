import {View, Pressable, ToastAndroid, Platform, StatusBar} from 'react-native';
import React, {useState} from 'react';
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
import {settingsStorage} from '../../lib/storage';
import AmbientBackground from '../../components/ui/AmbientBackground';
import RNReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Constants from 'expo-constants';
import DownloadLocationPreference from './components/DownloadLocationPreference';
import useNavigationPreferencesStore from '../../lib/zustand/navigationPreferencesStore';
import DownloadConcurrencyPreference from './components/DownloadConcurrencyPreference';
import AppText from '../../components/ui/Text';
import SettingsSection from '../../components/ui/SettingsSection';
import SettingsSwitchRow from '../../components/ui/SettingsSwitchRow';
import Surface from '../../components/ui/Surface';
import {useM3Colors} from '../../theme/M3PaletteContext';
import {
  getAnalytics,
  getCrashlytics,
  isFirebaseNativeReady,
} from '../../lib/utils/firebaseSafe';

const Preferences = () => {
  const navigation = useNavigation();
  const hasFirebase =
    Boolean(Constants?.expoConfig?.extra?.hasFirebase) &&
    isFirebaseNativeReady();
  const colors = useM3Colors();
  
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
  // const [showRecentlyWatched, setShowRecentlyWatched] = useState(
  //   settingsStorage.getBool('showRecentlyWatched') || false,
  // );
  const [disableDrawer, setDisableDrawer] = useState(
    settingsStorage.getBool('disableDrawer') || false,
  );

  const [ExcludedQualities, setExcludedQualities] = useState(
    settingsStorage.getExcludedQualities(),
  );

  const [showMediaControls, setShowMediaControls] = useState<boolean>(
    settingsStorage.showMediaControls(),
  );

  const [showHamburgerMenu, setShowHamburgerMenu] = useState<boolean>(
    settingsStorage.showHamburgerMenu(),
  );

  const [hideSeekButtons, setHideSeekButtons] = useState<boolean>(
    settingsStorage.hideSeekButtons(),
  );

  const [_enable2xGesture, _setEnable2xGesture] = useState<boolean>(
    settingsStorage.isEnable2xGestureEnabled(),
  );

  const [enableSwipeGesture, setEnableSwipeGesture] = useState<boolean>(
    settingsStorage.isSwipeGestureEnabled(),
  );

  const [showTabBarLables, setShowTabBarLables] = useState<boolean>(
    settingsStorage.showTabBarLabels(),
  );
  const hideDownloadsTab = useNavigationPreferencesStore(
    state => state.hideDownloadsTab,
  );
  const setHideDownloadsTab = useNavigationPreferencesStore(
    state => state.setHideDownloadsTab,
  );

  const [OpenExternalPlayer, setOpenExternalPlayer] = useState(
    settingsStorage.getBool('useExternalPlayer', false),
  );

  const [hapticFeedback, setHapticFeedback] = useState(
    settingsStorage.isHapticFeedbackEnabled(),
  );

  const [alwaysUseExternalDownload, setAlwaysUseExternalDownload] = useState(
    settingsStorage.getBool('alwaysExternalDownloader') || false,
  );

  const [telemetryOptIn, setTelemetryOptIn] = useState<boolean>(
    settingsStorage.isTelemetryOptIn(),
  );

  return (
    <AmbientBackground>
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
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
              Preferences
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
              Preferences
            </AppText>
          </View>

          <View className="px-5">

        <SettingsSection title="Experience">
          <SettingsSwitchRow
            title="Haptic feedback"
            description="Use subtle vibration for actions and selections"
            value={hapticFeedback}
            onValueChange={next => {
              settingsStorage.setHapticFeedbackEnabled(next);
              setHapticFeedback(next);
            }}
          />
          <SettingsSwitchRow
            title="Tab bar labels"
            description="Show destination names below navigation icons"
            value={showTabBarLables}
            onValueChange={next => {
              settingsStorage.setShowTabBarLabels(next);
              setShowTabBarLables(next);
              ToastAndroid.show(
                'Restart App to Apply Changes',
                ToastAndroid.SHORT,
              );
            }}
          />
          <SettingsSwitchRow
            title="Hide downloads tab"
            value={hideDownloadsTab}
            onValueChange={setHideDownloadsTab}
          />
          <SettingsSwitchRow
            title="Hamburger menu"
            value={showHamburgerMenu}
            onValueChange={next => {
              settingsStorage.setShowHamburgerMenu(next);
              setShowHamburgerMenu(next);
            }}
          />
          <SettingsSwitchRow
            title="Disable drawer"
            value={disableDrawer}
            onValueChange={next => {
              settingsStorage.setBool('disableDrawer', next);
              setDisableDrawer(next);
            }}
          />
          <SettingsSwitchRow
            title="External downloader"
            description="Send every download to another app"
            value={alwaysUseExternalDownload}
            divider={false}
            onValueChange={next => {
              settingsStorage.setBool('alwaysExternalDownloader', next);
              setAlwaysUseExternalDownload(next);
            }}
          />
        </SettingsSection>

        {hasFirebase ? (
          <SettingsSection title="Privacy">
            <SettingsSwitchRow
              title="Usage and crash reports"
              description="Help improve AirFlix with anonymous diagnostics"
              value={telemetryOptIn}
              divider={false}
              onValueChange={async next => {
                setTelemetryOptIn(next);
                settingsStorage.setTelemetryOptIn(next);
                try {
                  const crashlytics = getCrashlytics();
                  crashlytics &&
                    (await crashlytics().setCrashlyticsCollectionEnabled(next));
                } catch {}
                try {
                  const analytics = getAnalytics();
                  analytics &&
                    (await analytics().setAnalyticsCollectionEnabled(next));
                  analytics &&
                    (await analytics().setConsent({
                      analytics_storage: next,
                      ad_storage: next,
                      ad_user_data: next,
                      ad_personalization: next,
                    }));
                } catch {}
              }}
            />
          </SettingsSection>
        ) : null}

        <SettingsSection title="Playback">
          <SettingsSwitchRow
            title="External player"
            description="Open streams in your preferred video app"
            value={OpenExternalPlayer}
            onValueChange={next => {
              settingsStorage.setBool('useExternalPlayer', next);
              setOpenExternalPlayer(next);
            }}
          />
          <SettingsSwitchRow
            title="Media controls"
            value={showMediaControls}
            onValueChange={next => {
              settingsStorage.setShowMediaControls(next);
              setShowMediaControls(next);
            }}
          />
          <SettingsSwitchRow
            title="Hide seek buttons"
            value={hideSeekButtons}
            onValueChange={next => {
              settingsStorage.setHideSeekButtons(next);
              setHideSeekButtons(next);
            }}
          />
          <SettingsSwitchRow
            title="Swipe gestures"
            description="Adjust playback with gestures over the video"
            value={enableSwipeGesture}
            divider={false}
            onValueChange={next => {
              settingsStorage.setSwipeGestureEnabled(next);
              setEnableSwipeGesture(next);
            }}
          />
        </SettingsSection>

        <DownloadLocationPreference primary={colors.primary} />

        <DownloadConcurrencyPreference primary={colors.primary} />

        <View className="mb-6">
          <AppText
            role="labelLarge"
            className="mb-3 text-m3-on-surface-variant">
            Quality
          </AppText>
          <Surface level="low" className="p-4">
            <AppText role="bodyLarge" className="text-m3-on-surface">
              Excluded Qualities
            </AppText>
            <AppText
              role="bodySmall"
              className="mb-4 mt-1 text-m3-on-surface-variant">
              Hide lower resolutions from stream results
            </AppText>
            <View className="flex-row flex-wrap gap-3">
              {['360p', '480p', '720p'].map(quality => {
                const selected = ExcludedQualities.includes(quality);
                return (
                  <Pressable
                    key={quality}
                    onPress={() => {
                      if (settingsStorage.isHapticFeedbackEnabled()) {
                        RNReactNativeHapticFeedback.trigger('effectTick');
                      }
                      const newExcluded = ExcludedQualities.includes(quality)
                        ? ExcludedQualities.filter(q => q !== quality)
                        : [...ExcludedQualities, quality];
                      setExcludedQualities(newExcluded);
                      settingsStorage.setExcludedQualities(newExcluded);
                    }}
                    style={{
                      backgroundColor: selected
                        ? colors.secondaryContainer
                        : colors.surfaceContainerHigh,
                      borderColor: selected
                        ? colors.primary
                        : colors.outlineVariant,
                      borderRadius: 16,
                      borderWidth: 1,
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                    }}>
                    <AppText
                      role="labelLargeEmphasized"
                      style={{
                        color: selected
                          ? colors.onSecondaryContainer
                          : colors.onSurface,
                      }}>
                      {quality}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </Surface>
        </View>
        </View>
        </Animated.ScrollView>
      </View>
    </AmbientBackground>
  );
};

export default Preferences;

