import {NativeModules, Platform} from 'react-native';
import {settingsStorage} from '../storage';

const {DohModule} = NativeModules;

export const DOH_PROVIDERS = [
  {label: 'Cloudflare (1.1.1.1)', value: 'cloudflare'},
  {label: 'Google (8.8.8.8)', value: 'google'},
  {label: 'AdGuard', value: 'adguard'},
  {label: 'Custom', value: 'custom'},
  {label: 'Off', value: 'off'},
] as const;

export type DohProviderValue = (typeof DOH_PROVIDERS)[number]['value'];

export const syncDohSettings = async () => {
  if (Platform.OS !== 'android' || !DohModule) return;

  const enabled = settingsStorage.isDohEnabled();
  const provider = settingsStorage.getDohProvider();

  if (!enabled || provider === 'off') {
    await DohModule.setEnabled(false);
    return;
  }

  await DohModule.setEnabled(true);

  if (provider === 'custom') {
    const customUrl = settingsStorage.getDohCustomUrl();
    if (customUrl) {
      await DohModule.setCustomUrl(customUrl);
    }
  } else {
    await DohModule.setProvider(provider);
  }
};
