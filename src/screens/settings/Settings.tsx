import {AnimatedAppText} from '../../components/ui/Text';
import {
  DevSettings,
  ToastAndroid,
  View,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  Image,
  Linking,
} from 'react-native';
import React, {useCallback} from 'react';
import {
  settingsStorage,
  clearAllMMKVStorage,
} from '../../lib/storage';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import * as RNFS from '@dr.pogodin/react-native-fs';
import * as Application from 'expo-application';
import {notificationService} from '../../lib/services/Notification';
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
import SettingsSwitchRow from '../../components/ui/SettingsSwitchRow';
import LoadingIndicator from '../../components/ui/LoadingIndicator';
import {useM3Colors} from '../../theme/M3PaletteContext';
import {showAppDialog} from '../../lib/zustand/appDialogStore';
import {clearAppCache} from '../../lib/clearAppCache';
import SquareSettingsCard from '../../components/ui/SquareSettingsCard';
import AmbientBackground from '../../components/ui/AmbientBackground';

const deletePartialFile = async (filePath: string) => {
  try {
    if (await RNFS.exists(filePath)) {
      await RNFS.unlink(filePath);
    }
  } catch {}
};

const downloadUpdate = async (url: string, name: string) => {
  console.log('downloading', url, name);
  await notificationService.requestPermission();

  const filePath = `${RNFS.CachesDirectoryPath}/${name}`;
  let expectedSize = 0;

  const {promise} = RNFS.downloadFile({
    fromUrl: url,
    background: true,
    progressInterval: 1000,
    progressDivider: 1,
    toFile: filePath,
    begin: res => {
      expectedSize = res.contentLength;
      console.log('begin', res.jobId, res.statusCode, res.contentLength);
    },
    progress: res => {
      notificationService.showUpdateProgress(
        'Downloading Update',
        `Version ${Application.nativeApplicationVersion} -> ${name}`,
        {
          current: res.bytesWritten,
          max: res.contentLength,
          indeterminate: false,
        },
      );
    },
  });

  try {
    const res = await promise;
    await notificationService.cancelNotification('updateProgress');

    if (res.statusCode !== 200 || res.bytesWritten < expectedSize) {
      console.log(
        `[update] Download failed: status=${res.statusCode}, bytes=${res.bytesWritten}/${expectedSize}`,
      );
      await deletePartialFile(filePath);
      ToastAndroid.show(
        'Download failed, please try again',
        ToastAndroid.SHORT,
      );
      return;
    }

    await notificationService.displayUpdateNotification({
      id: 'downloadComplete',
      title: 'Download Complete',
      body: 'Tap to install',
      data: {filePath, action: 'install'},
    });
  } catch (error) {
    console.log('[update] Download error:', error);
    await notificationService.cancelNotification('updateProgress');
    await deletePartialFile(filePath);
    ToastAndroid.show('Download failed, please try again', ToastAndroid.SHORT);
  }
};

function compareVersions(localVersion: string, remoteVersion: string): boolean {
  try {
    const local = localVersion.split('.').map(Number);
    const remote = remoteVersion.split('.').map(Number);

    if (remote[0] > local[0]) return true;
    if (remote[0] < local[0]) return false;
    if (remote[1] > local[1]) return true;
    if (remote[1] < local[1]) return false;
    if (remote[2] > local[2]) return true;

    return false;
  } catch (error) {
    console.error('Invalid version format');
    return false;
  }
}

export const checkForUpdate = async (
  setUpdateLoading: React.Dispatch<React.SetStateAction<boolean>>,
  autoDownload: boolean,
  showToast: boolean = true,
) => {
  setUpdateLoading(true);
  try {
    const res = await fetch(
      'https://api.github.com/repos/d0x-dev/AirFlix/releases/latest',
    );
    const data = await res.json();
    const localVersion = Application.nativeApplicationVersion;
    if (!data.tag_name) {
      throw new Error(data.message || 'No release found');
    }
    const remoteVersion = Number(
      data.tag_name.replace('v', '')?.split('.').join(''),
    );
    if (compareVersions(localVersion || '', data.tag_name.replace('v', ''))) {
      ToastAndroid.show('New update available', ToastAndroid.SHORT);
      showAppDialog({
        title: `Update v${localVersion} -> ${data.tag_name}`,
        message: data.body,
        messageFormat: 'markdown',
        actions: [
          {label: 'Cancel'},
          {
            label: 'Update',
            variant: 'primary',
            onPress: () => {
              const apkAsset =
                data?.assets?.find(
                  (asset: any) =>
                    asset.name?.endsWith('.apk') &&
                    asset.name?.toLowerCase().includes('universal'),
                ) ||
                data?.assets?.find((asset: any) =>
                  asset.name?.endsWith('.apk'),
                );
              return autoDownload && apkAsset
                ? downloadUpdate(apkAsset.browser_download_url, apkAsset.name)
                : Linking.openURL(data.html_url);
            },
          },
        ],
      });
    } else {
      showToast && ToastAndroid.show('App is up to date', ToastAndroid.SHORT);
    }
  } catch (error) {
    ToastAndroid.show('Failed to check for update', ToastAndroid.SHORT);
    console.log('Update error', error);
  }
  setUpdateLoading(false);
};

type Props = NativeStackScreenProps<SettingsStackParamList, 'Settings'>;

const Settings = ({navigation}: Props) => {
  const colors = useM3Colors();
  const hideDownloadsTab = useNavigationPreferencesStore(
    state => state.hideDownloadsTab,
  );

  const scrollY = useSharedValue(0);
  const [updateLoading, setUpdateLoading] = React.useState(false);
  const [autoDownload, setAutoDownload] = React.useState(
    settingsStorage.isAutoDownloadEnabled(),
  );
  const [autoCheckUpdate, setAutoCheckUpdate] = React.useState<boolean>(
    settingsStorage.isAutoCheckUpdateEnabled(),
  );

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
          <AnimatedAppText style={[{ color: '#ffffff', fontSize: 20, marginLeft: 20 }, headerTextStyle]}>
            Settings
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
                <AppText role="titleLarge" style={{ color: '#ffffff', fontSize: 22 }}>
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
                    style={{color: '#a5c0ff', }}>
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
          
          {/* Updates Section */}
          <AnimatedSection delay={450}>
            <SettingsSection title="Updates">
              {!Constants.expoConfig?.extra?.isPlayStore && (
                <>
                  <SettingsSwitchRow
                    title="Auto install updates"
                    description="Download and install new releases automatically"
                    value={autoDownload}
                    onValueChange={next => {
                      setAutoDownload(next);
                      settingsStorage.setAutoDownloadEnabled(next);
                    }}
                  />
                  <SettingsSwitchRow
                    title="Check on startup"
                    description="Look for a new release when Airflix opens"
                    value={autoCheckUpdate}
                    onValueChange={next => {
                      setAutoCheckUpdate(next);
                      settingsStorage.setAutoCheckUpdateEnabled(next);
                    }}
                  />
                  <SettingsRow
                    title="Check for updates"
                    description="Compare this build with the latest release"
                    icon="update"
                    divider={false}
                    trailing={
                      updateLoading ? <LoadingIndicator size={14} /> : undefined
                    }
                    onPress={
                      updateLoading
                        ? undefined
                        : () => checkForUpdate(setUpdateLoading, autoDownload, true)
                    }
                  />
                </>
              )}
            </SettingsSection>
          </AnimatedSection>
        </View>
      </Animated.ScrollView>
    </View>
    </AmbientBackground>
  );
};

export default Settings;

