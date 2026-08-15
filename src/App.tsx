import useContentStore from './lib/zustand/contentStore';
import useThemeStore from './lib/zustand/themeStore';
import React, {useEffect, useState} from 'react';
import {useFonts} from 'expo-font';
import './global.css';
import Home from './screens/home/Home';
import Info from './screens/home/Info';
import Player from './screens/home/Player';
import Settings from './screens/settings/Settings';
import WatchList from './screens/WatchList';
import Search from './screens/Search';
import ScrollList from './screens/ScrollList';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import WebView from './screens/WebView';
import SearchResults from './screens/SearchResults';
import * as SystemUI from 'expo-system-ui';
// import DisableProviders from './screens/settings/DisableProviders';
import About from './screens/settings/About';
import {checkForUpdate} from './screens/settings/Settings';
import BootSplash from 'react-native-bootsplash';
import {enableFreeze, enableScreens} from 'react-native-screens';
import Preferences from './screens/settings/Preference';
import Appearance from './screens/settings/Appearance';
import {M3ThemeProvider} from './theme/M3ThemeProvider';
import {AppState, LogBox, useWindowDimensions} from 'react-native';
import {EpisodeLink} from './lib/providers/types';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Downloads from './screens/downloads/Downloads';
import DownloadedDetails from './screens/downloads/DownloadedDetails';
import SubtitlePreference from './screens/settings/SubtitleSettings';
import Extensions from './screens/settings/Extensions';
import Constants from 'expo-constants';
import {settingsStorage} from './lib/storage';
import {updateProvidersService} from './lib/services/UpdateProviders';
import {extensionManager} from './lib/services';
import {extensionStorage} from './lib/storage/extensionStorage';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from './lib/client';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import notifee, {EventType} from '@notifee/react-native';
import notificationService from './lib/services/Notification';
import WafWebViewDialog from './components/WafWebViewDialog';
import ProviderSandboxHost from './components/ProviderSandboxHost';
import {syncDohSettings} from './lib/services/dohService';
import {
  reconcileCompletedDownloadOutputs,
  reconcileDownloadState,
} from './lib/downloadReconciliation';
import useDownloadsStore from './lib/zustand/downloadsStore';
import useNavigationPreferencesStore from './lib/zustand/navigationPreferencesStore';
import {
  initializeSyncService,
  publishSyncManifest,
  syncFromSharedFolder,
} from './lib/sync/syncService';
import StreamingTabBar from './components/navigation/StreamingTabBar';
import AppDialogHost from './components/AppDialogHost';
import {
  getAnalytics,
  getCrashlytics,
  isFirebaseNativeReady,
} from './lib/utils/firebaseSafe';

enableScreens(true);
enableFreeze(true);

export type HomeStackParamList = {
  Home: undefined;
  Info: {link: string; provider?: string; poster?: string};
  ScrollList: {
    filter: string;
    title?: string;
    providerValue?: string;
    isSearch: boolean;
  };
  Webview: {link: string};
};

export type RootStackParamList = {
  TabStack:
    | {
        screen?: keyof TabStackParamList;
        params?: {
          screen?: string;
          params?: {
            screen?: string;
            params?: any;
          };
        };
      }
    | undefined;
  Player: {
    linkIndex: number;
    episodeList: EpisodeLink[];
    directUrl?: string;
    type: string;
    primaryTitle?: string;
    secondaryTitle?: string;
    poster: {
      logo?: string;
      poster?: string;
      background?: string;
    };
    file?: string;
    providerValue?: string;
    infoUrl?: string;
  };
  SettingsStack: undefined;
};

export type SearchStackParamList = {
  Search: undefined;
  ScrollList: {
    filter: string;
    title?: string;
    providerValue?: string;
    isSearch: boolean;
  };
  Info: {link: string; provider?: string; poster?: string};
  SearchResults: {filter: string; availableProviders?: string[]};
};

export type WatchListStackParamList = {
  WatchList: undefined;
  Info: {link: string; provider?: string; poster?: string};
};

export type SettingsStackParamList = {
  Settings: undefined;
  Appearance: undefined;
  DisableProviders: undefined;
  About: undefined;
  Preferences: undefined;
  SubTitlesPreferences: undefined;
  Extensions: undefined;
  DownloadsStack: undefined;
};

export type DownloadsStackParamList = {
  Downloads: undefined;
  DownloadedDetails: {groupId: string};
};

export type TabStackParamList = {
  HomeStack: undefined;
  SearchStack: undefined;
  WatchListStack: undefined;
  DownloadsStack: undefined;
};
const Tab = createBottomTabNavigator<TabStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
let pendingDownloadsNavigation = false;

export const openDownloadsScreen = (): void => {
  if (!navigationRef.isReady()) {
    pendingDownloadsNavigation = true;
    return;
  }
  pendingDownloadsNavigation = false;
  if (settingsStorage.hideDownloadsTab()) {
    navigationRef.navigate('SettingsStack', {screen: 'DownloadsStack'} as any);
    return;
  }
  navigationRef.navigate('TabStack', {screen: 'DownloadsStack'});
};

const App = () => {
  const [fontsLoaded] = useFonts({
    'Linotee': require('../assets/fonts/Linotee.ttf'),
    'BebasNeue': require('../assets/fonts/BebasNeue.ttf'),
  });
  const provider = useContentStore(state => state.provider);
  const {width: windowWidth} = useWindowDimensions();
  const isLargeScreen = windowWidth > 768;
  const useLinoteeFont = useThemeStore(state => state.useLinoteeFont);
  LogBox.ignoreLogs([
    'You have passed a style to FlashList',
    'new NativeEventEmitter()',
  ]);
  const HomeStack = createNativeStackNavigator<HomeStackParamList>();
  const Stack = createNativeStackNavigator<RootStackParamList>();
  const SearchStack = createNativeStackNavigator<SearchStackParamList>();
  const WatchListStack = createNativeStackNavigator<WatchListStackParamList>();
  const DownloadsStack = createNativeStackNavigator<DownloadsStackParamList>();
  const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
  const hasFirebase =
    Boolean(Constants?.expoConfig?.extra?.hasFirebase) &&
    isFirebaseNativeReady();

  // const showTabBarLables = settingsStorage.showTabBarLabels();

  SystemUI.setBackgroundColorAsync('black');

  useEffect(() => {
    let reconciled = false;
    const reconcile = () => {
      if (reconciled) {
        return;
      }
      reconciled = true;
      reconcileDownloadState()
        .then(() => initializeSyncService())
        .catch(error => console.error('Download startup failed:', error));
    };

    if (useDownloadsStore.persist.hasHydrated()) {
      reconcile();
      return;
    }
    return useDownloadsStore.persist.onFinishHydration(reconcile);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        reconcileCompletedDownloadOutputs().catch(error =>
          console.warn('Download foreground reconciliation failed:', error),
        );
        syncFromSharedFolder().catch(error =>
          console.warn('[AirflixSync] Foreground sync failed:', error),
        );
      } else {
        publishSyncManifest().catch(error =>
          console.warn('[AirflixSync] Background publish failed:', error),
        );
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        syncFromSharedFolder().catch(error =>
          console.warn('[AirflixSync] Periodic sync failed:', error),
        );
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const optIn = settingsStorage.isTelemetryOptIn();
    if (hasFirebase) {
      try {
        const crashlytics = getCrashlytics();
        crashlytics && crashlytics().setCrashlyticsCollectionEnabled(optIn);
      } catch {}
      try {
        const analytics = getAnalytics();
        analytics && analytics().setAnalyticsCollectionEnabled(optIn);
      } catch {}
      try {
        const analytics = getAnalytics();
        analytics &&
          analytics().setConsent({
            analytics_storage: optIn,
            ad_storage: optIn,
            ad_user_data: optIn,
            ad_personalization: optIn,
          });
      } catch {}

      // Mark app open
      try {
        const analytics = getAnalytics();
        analytics && analytics().logAppOpen();
      } catch {}
      // Example user property: theme
      try {
        const analytics = getAnalytics();
        analytics &&
          analytics().setUserProperty('theme_preference', 'fixed-neutral');
      } catch {}

      // Initial Crashlytics log
      try {
        const crashlytics = getCrashlytics();
        crashlytics && crashlytics().log('App mounted');
      } catch {}
    }

    const unsubscribe = notifee.onForegroundEvent(({type, detail}) => {
      notificationService.actionHandler({type, detail});
    });
    notifee
      .getInitialNotification()
      .then(initialNotification => {
        if (!initialNotification) {
          return;
        }
        const pressActionId = initialNotification.pressAction?.id;
        return notificationService.actionHandler({
          type:
            pressActionId && pressActionId !== 'default'
              ? EventType.ACTION_PRESS
              : EventType.PRESS,
          detail: initialNotification,
        });
      })
      .catch(error =>
        console.warn('Failed to handle initial notification:', error),
      );
    return () => {
      unsubscribe();
    };
  }, []);

  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize update service and extensions
  useEffect(() => {
    const init = async () => {
      try {
        await extensionManager.initialize();
        
        // Wait for Zustand hydration to finish so it doesn't overwrite our sync
        if (!useContentStore.persist.hasHydrated()) {
          await new Promise<void>(resolve => {
            useContentStore.persist.onFinishHydration(() => resolve());
          });
        }
        
        // Sync zustand store with the newly installed providers
        const installedProviders = extensionStorage.getInstalledProviders();
        if (installedProviders && installedProviders.length > 0) {
          useContentStore.getState().setInstalledProviders(installedProviders);
          
          const currentProvider = useContentStore.getState().provider;
          const currentProviderIsInstalled = installedProviders.some(
            p => p.value === currentProvider?.value
          );

          if (!currentProvider?.value || !currentProviderIsInstalled) {
            useContentStore.getState().setProvider(installedProviders[0]);
            useContentStore.getState().setActiveExtensionProvider(installedProviders[0]);
          }
        }
      } catch (err) {
        console.error('Extension init failed:', err);
      } finally {
        setIsInitializing(false);
        // Start automatic update checking at app startup after initialization
        updateProvidersService.startAutomaticUpdateCheck();
      }
    };
    init();

    // Cleanup on unmount
    return () => {
      updateProvidersService.stopAutomaticUpdateCheck();
    };
  }, []);

  // Initialize DNS over HTTPS
  useEffect(() => {
    syncDohSettings().catch(e =>
      console.warn('[DoH] Failed to sync settings:', e),
    );
  }, []);

  function HomeStackScreen() {
    return (
      <HomeStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'ios_from_right',
          animationDuration: 200,
          freezeOnBlur: true,
        }}>
        <HomeStack.Screen name="Home" component={Home} />
        <HomeStack.Screen name="Info" component={Info} />
        <HomeStack.Screen name="ScrollList" component={ScrollList} />
        <HomeStack.Screen name="Webview" component={WebView} />
      </HomeStack.Navigator>
    );
  }

  function SearchStackScreen() {
    return (
      <SearchStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'ios_from_right',
          animationDuration: 200,
          freezeOnBlur: true,
        }}>
        <SearchStack.Screen name="Search" component={Search} />
        <SearchStack.Screen name="ScrollList" component={ScrollList} />
        <SearchStack.Screen name="Info" component={Info} />
        <SearchStack.Screen name="SearchResults" component={SearchResults} />
        <HomeStack.Screen name="Webview" component={WebView} />
      </SearchStack.Navigator>
    );
  }

  function WatchListStackScreen() {
    return (
      <WatchListStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'ios_from_right',
          animationDuration: 200,
          freezeOnBlur: true,
        }}>
        <WatchListStack.Screen name="WatchList" component={WatchList} />
        <WatchListStack.Screen name="Info" component={Info} />
      </WatchListStack.Navigator>
    );
  }

  function SettingsStackScreen() {
    const insets = useSafeAreaInsets();
    const subpageOptions = {
      contentStyle: {paddingTop: insets.top},
    };

    return (
      <SettingsStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'ios_from_right',
          animationDuration: 200,
          freezeOnBlur: true,
        }}>
        <SettingsStack.Screen name="Settings" component={Settings} />
        <SettingsStack.Screen
          name="Appearance"
          component={Appearance}
          options={subpageOptions}
        />
        {/* <SettingsStack.Screen
          name="DisableProviders"
          component={DisableProviders}
        /> */}
        <SettingsStack.Screen
          name="About"
          component={About}
          options={subpageOptions}
        />
        <SettingsStack.Screen
          name="Preferences"
          component={Preferences}
          options={subpageOptions}
        />
        <SettingsStack.Screen
          name="Extensions"
          component={Extensions}
          options={subpageOptions}
        />
        <SettingsStack.Screen
          name="DownloadsStack"
          component={DownloadsStackScreen}
          options={subpageOptions}
        />
        <SettingsStack.Screen
          name="SubTitlesPreferences"
          component={SubtitlePreference}
          options={subpageOptions}
        />
      </SettingsStack.Navigator>
    );
  }

  function DownloadsStackScreen() {
    return (
      <DownloadsStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'ios_from_right',
          animationDuration: 200,
          freezeOnBlur: true,
        }}>
        <DownloadsStack.Screen name="Downloads" component={Downloads} />
        <DownloadsStack.Screen
          name="DownloadedDetails"
          component={DownloadedDetails}
        />
      </DownloadsStack.Navigator>
    );
  }
  function TabStack() {
    const hideDownloadsTab = useNavigationPreferencesStore(
      state => state.hideDownloadsTab,
    );
    return (
      <Tab.Navigator
        detachInactiveScreens={true}
        tabBar={props => <StreamingTabBar {...props} />}
        screenOptions={{
          animation: 'shift',
          popToTopOnBlur: false,
          tabBarPosition: isLargeScreen ? 'left' : 'bottom',
          headerShown: false,
          freezeOnBlur: true,
          tabBarHideOnKeyboard: true,
        }}>
        <Tab.Screen
          name="HomeStack"
          component={HomeStackScreen}
          options={{
            title: 'Home',
            tabBarIcon: ({focused, color, size}) => (
              <MaterialCommunityIcons
                name={focused ? 'home-variant' : 'home-variant-outline'}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tab.Screen
          name="SearchStack"
          component={SearchStackScreen}
          options={{
            title: 'Search',
            tabBarIcon: ({focused, color, size}) => (
              <MaterialCommunityIcons
                name={focused ? 'magnify' : 'magnify'}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tab.Screen
          name="WatchListStack"
          component={WatchListStackScreen}
          options={{
            title: 'Watch List',
            tabBarIcon: ({focused, color, size}) => (
              <MaterialCommunityIcons
                name={focused ? 'bookmark' : 'bookmark-outline'}
                color={color}
                size={size}
              />
            ),
          }}
        />
        {!hideDownloadsTab && (
          <Tab.Screen
            name="DownloadsStack"
            component={DownloadsStackScreen}
            options={{
              title: 'Downloads',
              tabBarIcon: ({focused, color, size}) => (
                <MaterialCommunityIcons
                  name={focused ? 'download' : 'download-outline'}
                  color={color}
                  size={size}
                />
              ),
            }}
          />
        )}
      </Tab.Navigator>
    );
  }

  useEffect(() => {
    const isPlayStore = Constants.expoConfig?.extra?.isPlayStore;
    if (!isPlayStore && settingsStorage.isAutoCheckUpdateEnabled()) {
      checkForUpdate(() => {}, settingsStorage.isAutoDownloadEnabled(), false);
    }
  }, []);

  if (isInitializing || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <M3ThemeProvider>
        <AppDialogHost />
        <GlobalErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <SafeAreaView
              edges={{
                right: 'off',
                top: 'off',
                left: 'off',
                bottom: 'additive',
              }}
              className="flex-1"
              style={{backgroundColor: 'black'}}>
              <NavigationContainer
                ref={navigationRef}
                onReady={async () => {
                  if (pendingDownloadsNavigation) {
                    openDownloadsScreen();
                  }
                  // Hide bootsplash
                  if (fontsLoaded) {
                    await BootSplash.hide({fade: true});
                  }
                  // Track initial screen
                  if (hasFirebase) {
                    try {
                      const route = navigationRef.getCurrentRoute();
                      if (route?.name) {
                        const analytics = getAnalytics();
                        analytics &&
                          (await analytics().logScreenView({
                            screen_name: route.name,
                            screen_class: 'Navigation',
                          }));
                      }
                    } catch {}
                  }
                }}
                onStateChange={async () => {
                  if (hasFirebase) {
                    try {
                      const route = navigationRef.getCurrentRoute();
                      if (route?.name) {
                        const analytics = getAnalytics();
                        analytics &&
                          (await analytics().logScreenView({
                            screen_name: route.name,
                            screen_class: 'Navigation',
                          }));
                      }
                    } catch {}
                  }
                }}
                theme={{
                  fonts: {
                    regular: {
                      fontFamily: useLinoteeFont ? 'Linotee' : 'Inter_400Regular',
                      fontWeight: (useLinoteeFont ? undefined : '400') as any,
                    },
                    medium: {
                      fontFamily: useLinoteeFont ? 'Linotee' : 'Inter_500Medium',
                      fontWeight: (useLinoteeFont ? undefined : '500') as any,
                    },
                    bold: {
                      fontFamily: useLinoteeFont ? 'Linotee' : 'Inter_700Bold',
                      fontWeight: (useLinoteeFont ? undefined : '700') as any,
                    },
                    heavy: {
                      fontFamily: useLinoteeFont ? 'Linotee' : 'Inter_800ExtraBold',
                      fontWeight: (useLinoteeFont ? undefined : '800') as any,
                    },
                  },
                  dark: true,
                  colors: {
                    background: 'transparent',
                    card: 'black',
                    primary: '#E4E4E4',
                    text: 'white',
                    border: 'black',
                    notification: '#E4E4E4',
                  },
                }}>
                <Stack.Navigator
                  screenOptions={{
                    headerShown: false,
                    animation: 'ios_from_right',
                    animationDuration: 200,
                    freezeOnBlur: true,
                    contentStyle: {backgroundColor: 'transparent'},
                  }}>
                  <Stack.Screen name="TabStack" component={TabStack} />
                  <Stack.Screen name="SettingsStack" component={SettingsStackScreen} />
                  <Stack.Screen
                    name="Player"
                    component={Player}
                    options={{orientation: 'landscape'}}
                  />
                </Stack.Navigator>
              </NavigationContainer>
              {/* Global WAF / captcha solving dialog, triggered by providers via
                providerContext.openWebView */}
              <WafWebViewDialog />
              {/* Isolated realm that runs untrusted provider code. Must stay
                mounted for the app lifetime: every provider call is dispatched
                into it. */}
              <ProviderSandboxHost />
            </SafeAreaView>
          </QueryClientProvider>
        </GlobalErrorBoundary>
      </M3ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
