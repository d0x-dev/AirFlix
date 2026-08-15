const mockBooleanValues = new Map<string, boolean>();
const mockNumberValues = new Map<string, number>();

jest.mock('../src/lib/storage/StorageService', () => ({
  mainStorage: {
    getBool: (key: string, defaultValue = false) =>
      mockBooleanValues.has(key) ? mockBooleanValues.get(key) : defaultValue,
    setBool: (key: string, value: boolean) => mockBooleanValues.set(key, value),
    getString: () => undefined,
    setString: jest.fn(),
    getNumber: (key: string) => mockNumberValues.get(key),
    setNumber: (key: string, value: number) => mockNumberValues.set(key, value),
    getArray: () => undefined,
    setArray: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../src/lib/downloadLocation', () => ({
  getDownloadLocationDisplayValue: () => 'Not selected',
  parseDownloadLocation: () => null,
  serializeDownloadLocation: () => '',
}));

import {
  SettingsKeys,
  settingsStorage,
} from '../src/lib/storage/SettingsStorage';

describe('settings defaults', () => {
  beforeEach(() => {
    mockBooleanValues.clear();
    mockNumberValues.clear();
  });

  it('enables default-on preferences when no value is stored', () => {
    expect(settingsStorage.isHapticFeedbackEnabled()).toBe(true);
    expect(settingsStorage.isNotificationsEnabled()).toBe(true);
    expect(settingsStorage.isAutoCheckUpdateEnabled()).toBe(true);
    expect(settingsStorage.showMediaControls()).toBe(true);
    expect(settingsStorage.showHamburgerMenu()).toBe(true);
    expect(settingsStorage.isSwipeGestureEnabled()).toBe(true);
    expect(settingsStorage.isTelemetryOptIn()).toBe(true);
    expect(settingsStorage.isDohEnabled()).toBe(true);
  });

  it('keeps intentional default-off preferences disabled', () => {
    expect(settingsStorage.showTabBarLabels()).toBe(false);
    expect(settingsStorage.hideDownloadsTab()).toBe(false);
    expect(settingsStorage.isAutoDownloadEnabled()).toBe(false);
    expect(settingsStorage.hideSeekButtons()).toBe(false);
    expect(settingsStorage.isEnable2xGestureEnabled()).toBe(false);
    expect(settingsStorage.usePureBlackBackground()).toBe(false);
  });

  it('defaults download concurrency to two and clamps saved values', () => {
    expect(settingsStorage.getDownloadConcurrency()).toBe(2);

    settingsStorage.setDownloadConcurrency(8);
    expect(settingsStorage.getDownloadConcurrency()).toBe(5);

    settingsStorage.setDownloadConcurrency(0);
    expect(settingsStorage.getDownloadConcurrency()).toBe(1);
  });

  it('persists the Downloads tab preference', () => {
    settingsStorage.setHideDownloadsTab(true);

    expect(settingsStorage.hideDownloadsTab()).toBe(true);
    expect(mockBooleanValues.get(SettingsKeys.HIDE_DOWNLOADS_TAB)).toBe(true);
  });

  it('persists the pure black background preference', () => {
    settingsStorage.setUsePureBlackBackground(true);

    expect(settingsStorage.usePureBlackBackground()).toBe(true);
    expect(mockBooleanValues.get(SettingsKeys.PURE_BLACK_BACKGROUND)).toBe(
      true,
    );
  });

  it('preserves explicit user opt-outs', () => {
    mockBooleanValues.set(SettingsKeys.HAPTIC_FEEDBACK, false);
    mockBooleanValues.set(SettingsKeys.NOTIFICATIONS_ENABLED, false);
    mockBooleanValues.set(SettingsKeys.SHOW_MEDIA_CONTROLS, false);
    mockBooleanValues.set(SettingsKeys.DOH_ENABLED, false);

    expect(settingsStorage.isHapticFeedbackEnabled()).toBe(false);
    expect(settingsStorage.isNotificationsEnabled()).toBe(false);
    expect(settingsStorage.showMediaControls()).toBe(false);
    expect(settingsStorage.isDohEnabled()).toBe(false);
  });
});
