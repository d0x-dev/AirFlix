import {View, Text, StatusBar, TouchableOpacity} from 'react-native';
import React from 'react';
import {useState} from 'react';
import useContentStore from '../lib/zustand/contentStore';
import Animated, {FadeInRight} from 'react-native-reanimated';
import {
  NavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {settingsStorage} from '../lib/storage';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {RootStackParamList} from '../App';
import {useM3Colors} from '../theme/M3PaletteContext';
import * as DocumentPicker from 'expo-document-picker';

const Tutorial = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const colors = useM3Colors();
  const {provider: currentProvider, installedProviders} = useContentStore(
    state => state,
  );
  const [showTutorial, setShowTutorial] = useState<boolean>(!currentProvider);

  // Handle default provider setup
  React.useEffect(() => {
    if (
      !currentProvider ||
      !currentProvider.value ||
      !installedProviders ||
      installedProviders.length === 0
    ) {
      setShowTutorial(true);
    } else {
      setShowTutorial(false);
    }
  }, [installedProviders, currentProvider]);

  // Handle status bar color
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBackgroundColor('#121212');
      StatusBar.setBarStyle('light-content');

      return () => {
        StatusBar.setBackgroundColor('#121212');
        StatusBar.setBarStyle('light-content');
      };
    }, []),
  );

  const handleGoToExtensions = () => {
    // Add haptic feedback
    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('effectClick', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }

    navigation.navigate('SettingsStack' as any, { screen: 'Extensions' } as any);
  };

  const handlePlayLocalFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      multiple: false,
      copyToCacheDirectory: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const video = result.assets[0];
    navigation.navigate('Player', {
      linkIndex: 0,
      episodeList: [
        {
          id: video.uri,
          title: video.name || 'Local video',
          link: video.uri,
        },
      ],
      directUrl: video.uri,
      type: 'mp4',
      primaryTitle: video.name || 'Local video',
      poster: {},
    });
  };

  return showTutorial ? (
    <View
      style={{backgroundColor: colors.background}}
      className="absolute inset-0 z-50 justify-center items-center w-full h-full">
      <Animated.View
        entering={FadeInRight.duration(500)}
        className="rounded-2xl p-6 w-full max-w-sm items-center">
        <MaterialCommunityIcons
          name="package-variant-closed"
          size={64}
          color={colors.onSurfaceVariant}
          style={{marginBottom: 16}}
        />
        <Text
          style={{
            color: colors.onSurface,
            fontSize: 24,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 16,
          }}>
          No Provider Installed
        </Text>
        <Text
          style={{
            color: colors.onSurfaceVariant,
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 24,
          }}>
          Connect your cloud provider to play network streams or play local
          content.
        </Text>
        <TouchableOpacity
          onPress={handleGoToExtensions}
          className="px-6 py-3 rounded-xl w-full flex-row items-center justify-center"
          style={{backgroundColor: colors.primary}}>
          <MaterialCommunityIcons
            name="download"
            size={20}
            color={colors.onPrimary}
          />
          <Text
            style={{
              color: colors.onPrimary,
              fontSize: 16,
              fontWeight: '600',
              marginLeft: 8,
            }}>
            Install Cloud Providers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePlayLocalFile}
          className="px-6 py-3 rounded-xl w-full flex-row items-center justify-center mt-3"
          style={{
            backgroundColor: colors.secondaryContainer,
            borderColor: colors.outline,
            borderWidth: 1,
          }}>
          <MaterialCommunityIcons
            name="play-circle-outline"
            size={20}
            color={colors.onSecondaryContainer}
          />
          <Text
            style={{
              color: colors.onSecondaryContainer,
              fontSize: 16,
              fontWeight: '600',
              marginLeft: 8,
            }}>
            Play local file
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  ) : null;
};

export default Tutorial;
