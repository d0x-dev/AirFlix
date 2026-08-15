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

