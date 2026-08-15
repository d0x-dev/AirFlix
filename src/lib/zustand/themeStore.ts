import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {MMKVLoader} from 'react-native-mmkv-storage';
import {settingsStorage} from '../storage';

const storage = new MMKVLoader().initialize();

export type AccentSource = 'wallpaper' | 'custom';

export interface Theme {
  primary: string;
  isCustom: boolean;
  /** Where the Material 3 palette comes from: the device wallpaper or a curated seed. */
  source: AccentSource;
  isPureBlack: boolean;
  setPrimary: (type: Theme['primary']) => void;
  setCustom: (isCustom: boolean) => void;
  setSource: (source: AccentSource) => void;
  setPureBlack: (isPureBlack: boolean) => void;
}

const useThemeStore = create<Theme>()(
  persist(
    set => ({
      primary: settingsStorage.getPrimaryColor(),
      isCustom: settingsStorage.isCustomTheme(),
      source: settingsStorage.getAccentSource(),
      isPureBlack: settingsStorage.isPureBlackBackgroundEnabled(),

      setPrimary: (primary: Theme['primary']) => {
        set({primary});
        settingsStorage.setPrimaryColor(primary);
      },
      setCustom: (isCustom: Theme['isCustom']) => {
        set({isCustom});
        settingsStorage.setCustomTheme(isCustom);
      },
      setSource: (source: AccentSource) => {
        set({source});
        settingsStorage.setAccentSource(source);
      },
      setPureBlack: (isPureBlack: boolean) => {
        set({isPureBlack});
        settingsStorage.setPureBlackBackgroundEnabled(isPureBlack);
      },
    }),
    {
      name: 'content-storage',
      //@ts-expect-error
      storage: createJSONStorage(() => storage),
    },
  ),
);

export default useThemeStore;
