import {View, ScrollView, Pressable} from 'react-native';
import React, {useState} from 'react';
import {extensionStorage, providersStorage} from '../../lib/storage';
import {SvgUri} from 'react-native-svg';
import AppText from '../../components/ui/Text';
import SettingsSwitchRow from '../../components/ui/SettingsSwitchRow';
import Surface from '../../components/ui/Surface';
import {useM3Colors} from '../../theme/M3PaletteContext';

const DisableProviders = () => {
  const colors = useM3Colors();
  const providersList = extensionStorage.getInstalledProviders();
  const [disabledProviders, setDisabledProviders] = useState<string[]>(
    providersStorage.getDisabledProviders(),
  );

  const toggleProvider = (providerId: string) => {
    const newDisabled = providersStorage.toggleProvider(providerId);
    setDisabledProviders(newDisabled);
  };

  const enableAll = () => {
    providersStorage.enableAllProviders();
    setDisabledProviders([]);
  };

  return (
    <ScrollView
      className="h-full w-full bg-m3-background"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{paddingBottom: 120, paddingTop: 20}}>
      <View className="px-5">
        <View className="mb-2 flex-row items-center justify-between">
          <AppText
            role="headlineLargeEmphasized"
            className="text-m3-on-background">
            Disable Providers
          </AppText>
          <Pressable
            onPress={enableAll}
            style={({pressed}) => ({
              backgroundColor: pressed
                ? colors.secondaryContainer
                : colors.surfaceContainerHigh,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 10,
            })}>
            <AppText
              role="labelLargeEmphasized"
              style={{color: colors.onSurface}}>
              Enable all
            </AppText>
          </Pressable>
        </View>

        <AppText role="bodyLarge" className="mb-6 text-m3-on-surface-variant">
          Choose which built-in sources can appear in discovery results
        </AppText>

        <Surface level="low" className="overflow-hidden">
          {providersList.map((provider, index) => (
            <View
              key={provider.value}
              className="flex-row items-center"
              style={{
                borderBottomColor: colors.outlineVariant,
                borderBottomWidth: index !== providersList.length - 1 ? 1 : 0,
              }}>
              <View className="ml-4 flex-row items-center">
                <View
                  className="mr-1 h-11 w-11 items-center justify-center rounded-2xl"
                  style={{backgroundColor: colors.secondaryContainer}}>
                  <SvgUri width={24} height={24} uri={provider.icon} />
                </View>
              </View>
              <View className="flex-1">
                <SettingsSwitchRow
                  title={provider.display_name}
                  description={provider.type || 'Content provider'}
                  value={!disabledProviders.includes(provider.value)}
                  onValueChange={() => toggleProvider(provider.value)}
                  divider={false}
                />
              </View>
            </View>
          ))}
        </Surface>

        <AppText
          role="bodySmall"
          className="mt-4 text-center text-m3-on-surface-variant">
          Changes will apply to new searches
        </AppText>
      </View>
    </ScrollView>
  );
};

export default DisableProviders;
