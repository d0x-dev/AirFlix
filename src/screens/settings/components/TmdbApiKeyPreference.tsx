import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, {useState} from 'react';
import {Pressable, TextInput, ToastAndroid, View} from 'react-native';
import AppText from '../../../components/ui/Text';
import SettingsSection from '../../../components/ui/SettingsSection';
import {settingsStorage} from '../../../lib/storage';
import {useM3Colors} from '../../../theme/M3PaletteContext';

const TmdbApiKeyPreference = () => {
  const colors = useM3Colors();
  const initialKey = settingsStorage.getTmdbApiKey();
  const [savedKey, setSavedKey] = useState(initialKey);
  const [inputKey, setInputKey] = useState(initialKey);
  const [showKey, setShowKey] = useState(false);
  const normalizedInput = inputKey.trim();
  const canSave = Boolean(normalizedInput) && normalizedInput !== savedKey;

  const saveKey = () => {
    if (!normalizedInput) {
      return;
    }
    settingsStorage.setTmdbApiKey(normalizedInput);
    setInputKey(normalizedInput);
    setSavedKey(normalizedInput);
    ToastAndroid.show('Custom TMDB API key saved', ToastAndroid.SHORT);
  };

  const clearKey = () => {
    settingsStorage.setTmdbApiKey('');
    setInputKey('');
    setSavedKey('');
    ToastAndroid.show('Using the default TMDB API key', ToastAndroid.SHORT);
  };

  return (
    <SettingsSection title="Metadata">
      <View style={{padding: 16}}>
        <AppText role="bodyLarge" style={{color: colors.onSurface}}>
          Custom TMDB API key
        </AppText>
        <AppText
          role="bodySmall"
          style={{
            color: colors.onSurfaceVariant,
            lineHeight: 19,
            marginTop: 4,
          }}>
          A custom TMDB API v3 key takes priority over the key bundled with
          Airflix. Clear it to return to the default.
        </AppText>

        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.surfaceContainerHighest,
            borderColor: savedKey ? colors.primary : colors.outlineVariant,
            borderRadius: 18,
            borderWidth: 1,
            flexDirection: 'row',
            marginTop: 16,
          }}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            importantForAutofill="no"
            onChangeText={setInputKey}
            onSubmitEditing={saveKey}
            placeholder="Enter TMDB API v3 key"
            placeholderTextColor={colors.onSurfaceVariant}
            secureTextEntry={!showKey}
            selectionColor={colors.primary}
            style={{
              color: colors.onSurface,
              flex: 1,
              fontSize: 15,
              height: 54,
              paddingHorizontal: 16,
            }}
            value={inputKey}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showKey ? 'Hide API key' : 'Show API key'}
            hitSlop={6}
            onPress={() => setShowKey(value => !value)}
            style={{
              alignItems: 'center',
              height: 48,
              justifyContent: 'center',
              width: 48,
            }}>
            <MaterialCommunityIcons
              name={showKey ? 'eye-off-outline' : 'eye-outline'}
              size={23}
              color={colors.primary}
            />
          </Pressable>
        </View>

        <View style={{flexDirection: 'row', gap: 10, marginTop: 14}}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear custom TMDB API key"
            disabled={!savedKey}
            onPress={clearKey}
            style={({pressed}) => ({
              alignItems: 'center',
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: 16,
              flex: 1,
              height: 48,
              justifyContent: 'center',
              opacity: !savedKey ? 0.38 : pressed ? 0.72 : 1,
            })}>
            <AppText
              role="labelLargeEmphasized"
              style={{color: colors.onSurface}}>
              Clear
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save custom TMDB API key"
            disabled={!canSave}
            onPress={saveKey}
            style={({pressed}) => ({
              alignItems: 'center',
              backgroundColor: colors.primary,
              borderRadius: 16,
              flex: 1,
              height: 48,
              justifyContent: 'center',
              opacity: !canSave ? 0.38 : pressed ? 0.72 : 1,
            })}>
            <AppText
              role="labelLargeEmphasized"
              style={{color: colors.onPrimary}}>
              Save
            </AppText>
          </Pressable>
        </View>

        <AppText
          role="labelSmall"
          style={{
            color: savedKey ? colors.primary : colors.onSurfaceVariant,
            marginTop: 12,
          }}>
          {savedKey ? 'Custom key active' : 'Using bundled default key'}
        </AppText>
      </View>
    </SettingsSection>
  );
};

export default TmdbApiKeyPreference;
