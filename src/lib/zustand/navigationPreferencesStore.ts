import {create} from 'zustand';
import {settingsStorage} from '../storage';

interface NavigationPreferencesState {
  hideDownloadsTab: boolean;
  setHideDownloadsTab: (hide: boolean) => void;
}

const useNavigationPreferencesStore = create<NavigationPreferencesState>(
  set => ({
    hideDownloadsTab: settingsStorage.hideDownloadsTab(),
    setHideDownloadsTab: hide => {
      settingsStorage.setHideDownloadsTab(hide);
      set({hideDownloadsTab: hide});
    },
  }),
);

export default useNavigationPreferencesStore;
