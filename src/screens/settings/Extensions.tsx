import React, {useState, useEffect} from 'react';
import {
  View,
  Pressable,
  StatusBar,
  Platform,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SettingsStackParamList} from '../../App';
import {MaterialCommunityIcons, FontAwesome6, Ionicons} from '@expo/vector-icons';
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
import useThemeStore from '../../lib/zustand/themeStore';
import useContentStore from '../../lib/zustand/contentStore';
import {
  extensionStorage,
  ProviderExtension,
  ProviderSource,
} from '../../lib/storage/extensionStorage';
import {extensionManager} from '../../lib/services/ExtensionManager';
import {
  updateProvidersService,
  UpdateInfo,
} from '../../lib/services/UpdateProviders';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {settingsStorage} from '../../lib/storage';
import ProviderSourceManager from './components/ProviderSourceManager';
import ProviderCard, {ProviderTestStatus} from './components/ProviderCard';

import {
  ProviderDiagnosticError,
  testProvider,
} from '../../lib/services/providerDiagnostics';
import AppDialog, {
  AppDialogAction,
  AppDialogVariant,
} from '../../components/AppDialog';
import ProviderTestProgressDialog, {
  ProviderTestStepState,
} from '../../components/ProviderTestProgressDialog';
import type {ProviderDiagnosticProgress} from '../../lib/services/providerDiagnostics';
import AppText from '../../components/ui/Text';
import {useM3Colors} from '../../theme/M3PaletteContext';
import AmbientBackground from '../../components/ui/AmbientBackground';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Extensions'>;

interface DialogState {
  title: string;
  message: string;
  variant: AppDialogVariant;
  actions?: AppDialogAction[];
}

interface ProviderTestState {
  providerName: string;
  steps: ProviderTestStepState;
  resultMessage?: string;
}

const createProviderTestSteps = (): ProviderTestStepState => ({
  catalog: 'pending',
  posts: 'pending',
  metadata: 'pending',
  playback: 'pending',
  streams: 'pending',
});

const isSameProvider = (
  left: ProviderExtension | undefined,
  right: ProviderExtension,
) =>
  left?.value === right.value && left.source?.author === right.source?.author;

const Extensions = ({navigation}: Props) => {
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
        ['transparent', colors.background]
      ),
      borderBottomWidth: interpolate(scrollY.value, [30, 60], [0, 1], Extrapolation.CLAMP),
      borderBottomColor: colors.outlineVariant,
    };
  });

  const primary = colors.primary;
  const activeExtensionProvider = useContentStore(state => state.provider);
  const setActiveExtensionProvider = useContentStore(
    state => state.setProvider,
  );
  const installedProviders = useContentStore(state => state.installedProviders);
  const availableProviders = useContentStore(state => state.availableProviders);
  const setInstalledProviders = useContentStore(
    state => state.setInstalledProviders,
  );
  const setAvailableProviders = useContentStore(
    state => state.setAvailableProviders,
  );
  const [installingProvider, setInstallingProvider] = useState<string | null>(
    null,
  );
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null);
  const [updateInfos, setUpdateInfos] = useState<UpdateInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [providerTest, setProviderTest] = useState<ProviderTestState | null>(
    null,
  );
  const [providerTestStatuses, setProviderTestStatuses] = useState<
    Record<string, ProviderTestStatus>
  >({});
  const [activeSourceAuthor, setActiveSourceAuthor] = useState<string>(
    extensionStorage.getProviderSource()?.author || '',
  );
  const showDialog = (
    title: string,
    message: string,
    variant: AppDialogVariant = 'info',
    actions?: AppDialogAction[],
  ) => setDialog({title, message, variant, actions});
  // Load providers on component mount
  useEffect(() => {
    const initializeExtensions = async () => {
      try {
        await extensionManager.initialize();
        const source = extensionStorage.getProviderSource();
        const author = source?.author || '';
        setActiveSourceAuthor(author);
        loadProviders(author);
        await checkForUpdates();

        // Try to fetch latest providers if we don't have any
        if (
          author &&
          (!availableProviders || availableProviders.length === 0)
        ) {
          await refreshProviders(author);
        }
      } catch (error) {
        // Still try to load from cache if initialization fails
        loadProviders();
      }
    };

    initializeExtensions();
  }, []);

  const loadProviders = (author?: string) => {
    const selectedAuthor =
      author || extensionStorage.getProviderSource()?.author || '';
    const installed = extensionStorage.getInstalledProviders() || [];
    const available = selectedAuthor
      ? extensionStorage.getAvailableProviders(selectedAuthor)
      : [];
    setInstalledProviders(installed);
    setAvailableProviders(available.filter(item => item && !item.disabled));
    setActiveSourceAuthor(selectedAuthor);
  };

  const checkForUpdates = async () => {
    const source = extensionStorage.getProviderSource();
    if (!source) {
      setUpdateInfos([]);
      return;
    }

    try {
      const updates = await updateProvidersService.checkForUpdatesManual();
      setUpdateInfos(updates);
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const handleUpdateProvider = async (provider: ProviderExtension) => {
    if (!provider || !provider.value) {
      showDialog('Error', 'Invalid provider data', 'error');
      return;
    }

    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('effectClick', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }

    const providerKey = `${provider.source?.author || ''}:${provider.value}`;
    setUpdatingProvider(providerKey);
    try {
      const success = await updateProvidersService.updateProvider(provider);
      if (success) {
        loadProviders();
        await checkForUpdates();

        // Update the active provider if it was the one being updated
        if (
          activeExtensionProvider?.value === provider.value &&
          activeExtensionProvider?.source?.author === provider.source?.author
        ) {
          setActiveExtensionProvider(provider);
        }
      } else {
        showDialog(
          'Error',
          'Failed to update provider. Please try again.',
          'error',
        );
      }
    } catch (error) {
      console.error('Update error:', error);
      showDialog(
        'Error',
        'Failed to update provider. Please try again.',
        'error',
      );
    } finally {
      setUpdatingProvider(null);
    }
  };

  const handleInstallProvider = async (provider: ProviderExtension) => {
    if (!provider || !provider.value) {
      showDialog('Error', 'Invalid provider data', 'error');
      return;
    }

    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('effectClick', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }

    const providerKey = `${provider.source?.author || ''}:${provider.value}`;
    setInstallingProvider(providerKey);
    try {
      await extensionManager.installProvider(provider);
      loadProviders();

      const refreshedInstalledProviders =
        extensionStorage.getInstalledProviders() || [];
      setInstalledProviders(refreshedInstalledProviders);

      // Keep the current provider active. Switching here can immediately run
      // newly downloaded provider code in mounted screens and block the UI.
      // Read after the download so concurrent installs cannot act on a stale
      // provider captured when their handlers started.
      const currentProvider = useContentStore.getState().provider;
      const currentProviderIsInstalled = refreshedInstalledProviders.some(
        installedProvider => isSameProvider(installedProvider, currentProvider),
      );
      const installedSameValueFromAnotherSource =
        currentProvider?.value === provider.value &&
        currentProvider.source?.author !== provider.source?.author;

      if (
        !currentProvider?.value ||
        !currentProviderIsInstalled ||
        installedSameValueFromAnotherSource
      ) {
        setActiveExtensionProvider(provider);
      }
    } catch (error) {
      console.error('Installation error:', error);
      showDialog(
        'Error',
        'Failed to install provider. Please try again.',
        'error',
      );
    } finally {
      setInstallingProvider(null);
    }
  };
  const handleUninstallProvider = (provider: ProviderExtension) => {
    if (!provider || !provider.value) {
      showDialog('Error', 'Invalid provider data', 'error');
      return;
    }

    showDialog(
      'Uninstall Provider',
      `Are you sure you want to uninstall ${
        provider.display_name || 'this provider'
      }?`,
      'warning',
      [
        {label: 'Cancel'},
        {
          label: 'Uninstall',
          variant: 'destructive',
          testID: `confirm-uninstall-${provider.value}`,
          onPress: () => {
            extensionStorage.uninstallProvider(
              provider.value,
              provider.source?.author,
            );
            loadProviders();
            setInstalledProviders(
              extensionStorage.getInstalledProviders() || [],
            );

            // If this was the active provider, clear it
            if (
              activeExtensionProvider?.value === provider?.value &&
              activeExtensionProvider?.source?.author ===
                provider?.source?.author
            ) {
              setActiveExtensionProvider(
                extensionStorage.getInstalledProviders()[0] || {
                  value: '',
                  display_name: '',
                  source: {author: '', url: ''},
                  type: '',
                  version: '',
                },
              );
            }
          },
        },
      ],
    );
  };
  const handleSetActiveProvider = (provider: ProviderExtension) => {
    if (!provider || !provider.value) {
      showDialog('Error', 'Invalid provider data', 'error');
      return;
    }

    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('effectClick', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }
    setActiveExtensionProvider(provider);
  };

  const handleTestProvider = async (provider: ProviderExtension) => {
    const providerKey = `${provider.source?.author || ''}:${provider.value}`;
    setProviderTestStatuses(current => ({
      ...current,
      [providerKey]: 'testing',
    }));
    setProviderTest({
      providerName: provider.display_name,
      steps: createProviderTestSteps(),
    });
    const handleProgress = (progress: ProviderDiagnosticProgress) => {
      setProviderTest(current =>
        current
          ? {
              ...current,
              steps: {
                ...current.steps,
                [progress.stage]: progress.status,
              },
              resultMessage:
                progress.status === 'failed'
                  ? progress.detail
                  : current.resultMessage,
            }
          : current,
      );
    };
    try {
      const result = await testProvider(provider.value, handleProgress);
      const playableTitle =
        result.episode?.title || result.directLink?.title || 'Direct stream';
      setProviderTest(current =>
        current
          ? {
              ...current,
              resultMessage: [
                `Provider: ${provider.display_name}`,
                `Catalog: ${result.catalog.title}`,
                `List: ${result.post.title}`,
                `Metadata: ${result.metadata.title}`,
                `Playback: ${playableTitle}`,
                `Streams: ${result.streams.length}`,
              ].join('\n'),
            }
          : current,
      );
      setProviderTestStatuses(current => ({
        ...current,
        [providerKey]: 'working',
      }));
    } catch (error) {
      const stage =
        error instanceof ProviderDiagnosticError ? error.stage : 'unknown';
      const message = error instanceof Error ? error.message : String(error);
      setProviderTest(current =>
        current
          ? {
              ...current,
              resultMessage: `Stage: ${stage}\n${message}`,
            }
          : current,
      );
      setProviderTestStatuses(current => ({
        ...current,
        [providerKey]: 'failed',
      }));
    }
  };

  const refreshProviders = async (sourceAuthor: string) => {
    setRefreshing(true);
    try {
      if (!sourceAuthor) {
        setAvailableProviders([]);
        return;
      }

      const source = extensionStorage
        .getProviderSources()
        .find(item => item.author === sourceAuthor);

      if (!source) {
        setAvailableProviders([]);
        return;
      }

      const providers = await extensionManager.fetchManifest(source, true);

      setAvailableProviders(providers);

      loadProviders(sourceAuthor);
      await checkForUpdates();
    } catch (error) {
      console.error('Refresh error:', error);
      showDialog(
        'Error',
        'Failed to refresh providers list. Please check your internet connection.',
        'error',
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await refreshProviders(activeSourceAuthor);
  };
  const renderProviderCard = ({item}: {item: ProviderExtension}) => {
    if (!item || !item.value) {
      return null;
    }
    const itemKey = `${item.source?.author || ''}:${item.value}`;
    const isActive =
      activeExtensionProvider?.value === item.value &&
      activeExtensionProvider?.source?.author === item.source?.author;
    const isInstalled = (installedProviders || []).some(installedProvider =>
      isSameProvider(installedProvider, item),
    );
    const isInstalling = installingProvider === itemKey;
    const isUpdating = updatingProvider === itemKey;
    const updateInfo = updateInfos.find(
      info =>
        info.provider.value === item.value &&
        info.provider.source?.author === item.source?.author,
    );
    const hasUpdate = updateInfo?.hasUpdate || false;

    return (
      <ProviderCard
        provider={item}
        itemKey={itemKey}
        installed={isInstalled}
        active={isActive}
        installing={isInstalling}
        updating={isUpdating}
        testStatus={providerTestStatuses[itemKey] || 'untested'}
        hasUpdate={hasUpdate}
        primary={primary}
        onActivate={() => handleSetActiveProvider(item)}
        onInstall={() => handleInstallProvider(item)}
        onUpdate={() => updateInfo && handleUpdateProvider(updateInfo.provider)}
        onTest={() => handleTestProvider(item)}
        onUninstall={() => handleUninstallProvider(item)}
      />
    );
  };
  const currentData = Array.from(
    [...(availableProviders || []), ...(installedProviders || [])]
      .filter(item => item && item.value)
      .reduce((providers, item) => {
        const key = `${item.source?.author || ''}:${item.value}`;
        const existing = providers.get(key);
        providers.set(key, existing ? {...item, ...existing} : item);
        return providers;
      }, new Map<string, ProviderExtension>())
      .values(),
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
              Provider Manager
            </Animated.Text>
          </View>
        </Animated.View>

      {/* Provider list */}
      <Animated.FlatList
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        bounces={true}
        overScrollMode="always"
        entering={FadeInUp.springify()}
        layout={Layout.springify()}
        ListHeaderComponent={
          <>
            <View style={{ paddingHorizontal: 20, marginBottom: 24, marginTop: 10 }}>
              <AppText role="headlineLarge" style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 34 }}>
                Providers
              </AppText>
            </View>
            <ProviderSourceManager
              visible
              primary={primary}
              onSourceChanged={async (source: ProviderSource | undefined) => {
                const author = source?.author || '';
                setActiveSourceAuthor(author);
                loadProviders(author);
                await refreshProviders(author);
              }}
            />

            <View className="mb-1 mt-6 flex-row items-center justify-between px-5">
              <AppText role="titleLargeEmphasized" className="text-m3-on-background">
                Available providers
              </AppText>
              <View
                className="min-w-9 items-center px-2.5 py-1.5"
                style={{
                  backgroundColor: colors.secondaryContainer,
                  borderRadius: 14,
                }}>
                <AppText
                  role="labelMediumEmphasized"
                  style={{color: colors.onSecondaryContainer}}>
                  {currentData.length}
                </AppText>
              </View>
            </View>
          </>
        }
        data={currentData}
        keyExtractor={(item, index) =>
          `${item?.source?.author || 'none'}:${item?.value || `provider-${index}`}`
        }
        renderItem={renderProviderCard}
        className="w-full"
        contentContainerStyle={{
          paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 85 : 120, // Push content down below the sticky bar
          paddingBottom: 120,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[primary]}
            tintColor={primary}
            progressBackgroundColor={colors.surfaceContainerHigh}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <MaterialCommunityIcons
              name="package-variant"
              size={64}
              color={colors.onSecondaryContainer}
            />
            <AppText
              role="titleLargeEmphasized"
              className="mt-4 text-m3-on-surface">
              No providers available
            </AppText>
            <AppText
              role="bodyMedium"
              className="mt-2 px-8 text-center text-m3-on-surface-variant">
              Add or refresh a source to check for available providers
            </AppText>
          </View>
        }
      />
      <AppDialog
        visible={dialog !== null}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        primary={primary}
        variant={dialog?.variant}
        actions={dialog?.actions}
        onDismiss={() => setDialog(null)}
      />
      <ProviderTestProgressDialog
        visible={providerTest !== null}
        providerName={providerTest?.providerName || ''}
        steps={providerTest?.steps || createProviderTestSteps()}
        resultMessage={providerTest?.resultMessage}
        primary={primary}
        onClose={() => setProviderTest(null)}
      />
    </View>
    </AmbientBackground>
  );
};

export default Extensions;

