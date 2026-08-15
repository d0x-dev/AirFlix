import {mainStorage} from './StorageService';
import {
  DownloadLocationConfig,
  getDownloadLocationDisplayValue,
  parseDownloadLocation,
  serializeDownloadLocation,
} from '../downloadLocation';

/**
 * Storage keys for settings
 */
export enum SettingsKeys {
  // UI preferences
  PRIMARY_COLOR = 'primaryColor',
  IS_CUSTOM_THEME = 'isCustomTheme',
  SHOW_TAB_BAR_LABELS = 'showTabBarLabels',
  HIDE_DOWNLOADS_TAB = 'hideDownloadsTab',
  CUSTOM_COLOR = 'customColor',
  ACCENT_SOURCE = 'accentSource',
  LAUNCHER_ICON = 'launcherIcon',
  DYNAMIC_INFO_ACCENT = 'dynamicInfoAccent',
  PURE_BLACK_BACKGROUND = 'pureBlackBackground',
  // Feedback settings
  HAPTIC_FEEDBACK = 'hapticFeedback',
  NOTIFICATIONS_ENABLED = 'notificationsEnabled',

  // Update settings
  AUTO_CHECK_UPDATE = 'autoCheckUpdate',
  AUTO_DOWNLOAD = 'autoDownload',

  // Player settings
  SHOW_MEDIA_CONTROLS = 'showMediaControls',
  SHOW_HAMBURGER_MENU = 'showHamburgerMenu',
  HIDE_SEEK_BUTTONS = 'hideSeekButtons',
  ENABLE_2X_GESTURE = 'enable2xGesture',
  ENABLE_SWIPE_GESTURE = 'enableSwipeGesture',

  // Quality settings
  EXCLUDED_QUALITIES = 'excludedQualities',

  // Download settings
  DOWNLOAD_LOCATION = 'downloadLocation',
  DOWNLOAD_CONCURRENCY = 'downloadConcurrency',

  // Subtitle settings
  SUBTITLE_FONT_SIZE = 'subtitleFontSize',
  SUBTITLE_OPACITY = 'subtitleOpacity',
  SUBTITLE_BOTTOM_PADDING = 'subtitleBottomPadding',

  LIST_VIEW_TYPE = 'viewType',

  // Telemetry (privacy)
  TELEMETRY_OPT_IN = 'telemetryOptIn',

  // Metadata services
  TMDB_API_KEY = 'tmdbApiKey',
  TMDB_API_KEY_REVISION = 'tmdbApiKeyRevision',

  // DNS over HTTPS
  DOH_ENABLED = 'dohEnabled',
  DOH_PROVIDER = 'dohProvider',
  DOH_CUSTOM_URL = 'dohCustomUrl',
}

/**
 * Settings storage manager
 */
export class SettingsStorage {
  // Theme settings
  getPrimaryColor(): string {
    return mainStorage.getString(SettingsKeys.PRIMARY_COLOR) || '#FFFFFF';
  }

  setPrimaryColor(color: string): void {
    mainStorage.setString(SettingsKeys.PRIMARY_COLOR, color);
  }

  isCustomTheme(): boolean {
    return mainStorage.getBool(SettingsKeys.IS_CUSTOM_THEME);
  }

  setCustomTheme(isCustom: boolean): void {
    mainStorage.setBool(SettingsKeys.IS_CUSTOM_THEME, isCustom);
  }

  getCustomColor(): string {
    return mainStorage.getString(SettingsKeys.CUSTOM_COLOR) || '#FFFFFF';
  }

  setCustomColor(color: string): void {
    mainStorage.setString(SettingsKeys.CUSTOM_COLOR, color);
  }

  /**
   * Accent source for the Material 3 palette. `wallpaper` follows Material You
   * (Android 12+), `custom` derives the palette from the stored seed color.
   */
  getAccentSource(): 'wallpaper' | 'custom' {
    return mainStorage.getString(SettingsKeys.ACCENT_SOURCE) === 'wallpaper'
      ? 'wallpaper'
      : 'custom';
  }

  setAccentSource(source: 'wallpaper' | 'custom'): void {
    mainStorage.setString(SettingsKeys.ACCENT_SOURCE, source);
  }

  isDynamicInfoAccentEnabled(): boolean {
    return mainStorage.getBool(SettingsKeys.DYNAMIC_INFO_ACCENT, true);
  }

  setDynamicInfoAccentEnabled(enabled: boolean): void {
    mainStorage.setBool(SettingsKeys.DYNAMIC_INFO_ACCENT, enabled);
  }

  isPureBlackBackgroundEnabled(): boolean {
    return mainStorage.getBool(SettingsKeys.PURE_BLACK_BACKGROUND, false);
  }

  setPureBlackBackgroundEnabled(enabled: boolean): void {
    mainStorage.setBool(SettingsKeys.PURE_BLACK_BACKGROUND, enabled);
  }

  getLauncherIcon(): 'white' | 'tomato' | 'gray' | 'blue' | 'lavender' {
    const icon = mainStorage.getString(SettingsKeys.LAUNCHER_ICON);
    return icon === 'white' ||
      icon === 'gray' ||
      icon === 'blue' ||
      icon === 'lavender'
      ? icon
      : 'white';
  }

  setLauncherIcon(
    icon: 'white' | 'tomato' | 'gray' | 'blue' | 'lavender',
  ): void {
    mainStorage.setString(SettingsKeys.LAUNCHER_ICON, icon);
  }

  // UI preferences
  showTabBarLabels(): boolean {
    return mainStorage.getBool(SettingsKeys.SHOW_TAB_BAR_LABELS, true);
  }

  setShowTabBarLabels(show: boolean): void {
    mainStorage.setBool(SettingsKeys.SHOW_TAB_BAR_LABELS, show);
  }

  hideDownloadsTab(): boolean {
    return mainStorage.getBool(SettingsKeys.HIDE_DOWNLOADS_TAB, false);
  }

  setHideDownloadsTab(hide: boolean): void {
    mainStorage.setBool(SettingsKeys.HIDE_DOWNLOADS_TAB, hide);
  }

  isHapticFeedbackEnabled(): boolean {
    return mainStorage.getBool(SettingsKeys.HAPTIC_FEEDBACK, true);
  }
  setHapticFeedbackEnabled(enabled: boolean): void {
    mainStorage.setBool(SettingsKeys.HAPTIC_FEEDBACK, enabled);
  }

  isNotificationsEnabled(): boolean {
    return mainStorage.getBool(SettingsKeys.NOTIFICATIONS_ENABLED, true);
  }

  setNotificationsEnabled(enabled: boolean): void {
    mainStorage.setBool(SettingsKeys.NOTIFICATIONS_ENABLED, enabled);
  }

  // Update settings
  isAutoCheckUpdateEnabled(): boolean {
    return mainStorage.getBool(SettingsKeys.AUTO_CHECK_UPDATE, true);
  }

  setAutoCheckUpdateEnabled(enabled: boolean): void {
    mainStorage.setBool(SettingsKeys.AUTO_CHECK_UPDATE, enabled);
  }

  isAutoDownloadEnabled(): boolean {
    return mainStorage.getBool(SettingsKeys.AUTO_DOWNLOAD, false);
  }

  setAutoDownloadEnabled(enabled: boolean): void {
    mainStorage.setBool(SettingsKeys.AUTO_DOWNLOAD, enabled);
  }

  // Player settings
  showMediaControls(): boolean {
    return mainStorage.getBool(SettingsKeys.SHOW_MEDIA_CONTROLS, true);
  }

  setShowMediaControls(show: boolean): void {
    mainStorage.setBool(SettingsKeys.SHOW_MEDIA_CONTROLS, show);
  }

  showHamburgerMenu(): boolean {
    return mainStorage.getBool(SettingsKeys.SHOW_HAMBURGER_MENU, true);
  }

  setShowHamburgerMenu(show: boolean): void {
    mainStorage.setBool(SettingsKeys.SHOW_HAMBURGER_MENU, show);
  }

  hideSeekButtons(): boolean {
    return mainStorage.getBool(SettingsKeys.HIDE_SEEK_BUTTONS, false);
  }

  setHideSeekButtons(hide: boolean): void {
    mainStorage.setBool(SettingsKeys.HIDE_SEEK_BUTTONS, hide);
  }

  isEnable2xGestureEnabled(): boolean {
    return mainStorage.getBool(SettingsKeys.ENABLE_2X_GESTURE, false);
  }

  setEnable2xGesture(enabled: boolean): void {
    mainStorage.setBool(SettingsKeys.ENABLE_2X_GESTURE, enabled);
  }

  isSwipeGestureEnabled(): boolean {
    return mainStorage.getBool(SettingsKeys.ENABLE_SWIPE_GESTURE, true);
  }

  setSwipeGestureEnabled(enabled: boolean): void {
    mainStorage.setBool(SettingsKeys.ENABLE_SWIPE_GESTURE, enabled);
  }

  // Quality settings
  getExcludedQualities(): string[] {
    return mainStorage.getArray<string>(SettingsKeys.EXCLUDED_QUALITIES) || [];
  }

  setExcludedQualities(qualities: string[]): void {
    mainStorage.setArray(SettingsKeys.EXCLUDED_QUALITIES, qualities);
  }

  getDownloadLocationConfig(): DownloadLocationConfig | null {
    return parseDownloadLocation(
      mainStorage.getString(SettingsKeys.DOWNLOAD_LOCATION),
    );
  }

  getDownloadLocation(): string {
    return getDownloadLocationDisplayValue(this.getDownloadLocationConfig());
  }

  setDownloadLocation(location: DownloadLocationConfig): void {
    mainStorage.setString(
      SettingsKeys.DOWNLOAD_LOCATION,
      serializeDownloadLocation(location),
    );
  }

  resetDownloadLocation(): void {
    mainStorage.delete(SettingsKeys.DOWNLOAD_LOCATION);
  }

  getDownloadConcurrency(): number {
    const value = mainStorage.getNumber(SettingsKeys.DOWNLOAD_CONCURRENCY);
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.min(Math.max(Math.round(value), 1), 5)
      : 2;
  }

  setDownloadConcurrency(value: number): void {
    mainStorage.setNumber(
      SettingsKeys.DOWNLOAD_CONCURRENCY,
      Math.min(Math.max(Math.round(value), 1), 5),
    );
  }

  // Subtitle settings
  getSubtitleFontSize(): number {
    return mainStorage.getNumber(SettingsKeys.SUBTITLE_FONT_SIZE) || 16;
  }

  setSubtitleFontSize(size: number): void {
    mainStorage.setNumber(SettingsKeys.SUBTITLE_FONT_SIZE, size);
  }

  getSubtitleOpacity(): number {
    const opacityStr = mainStorage.getString(SettingsKeys.SUBTITLE_OPACITY);
    return opacityStr ? parseFloat(opacityStr) : 1;
  }

  setSubtitleOpacity(opacity: number): void {
    mainStorage.setString(SettingsKeys.SUBTITLE_OPACITY, opacity.toString());
  }

  getSubtitleBottomPadding(): number {
    return mainStorage.getNumber(SettingsKeys.SUBTITLE_BOTTOM_PADDING) || 10;
  }

  setSubtitleBottomPadding(padding: number): void {
    mainStorage.setNumber(SettingsKeys.SUBTITLE_BOTTOM_PADDING, padding);
  }

  getListViewType(): number {
    return parseInt(
      mainStorage.getString(SettingsKeys.LIST_VIEW_TYPE) || '1',
      10,
    );
  }

  setListViewType(type: number): void {
    mainStorage.setString(SettingsKeys.LIST_VIEW_TYPE, type.toString());
  }

  // Telemetry / Privacy
  isTelemetryOptIn(): boolean {
    return mainStorage.getBool(SettingsKeys.TELEMETRY_OPT_IN, true);
  }

  setTelemetryOptIn(enabled: boolean): void {
    mainStorage.setBool(SettingsKeys.TELEMETRY_OPT_IN, enabled);
  }

  getTmdbApiKey(): string {
    return mainStorage.getString(SettingsKeys.TMDB_API_KEY)?.trim() || '';
  }

  setTmdbApiKey(apiKey: string): void {
    const normalizedKey = apiKey.trim();
    if (normalizedKey) {
      mainStorage.setString(SettingsKeys.TMDB_API_KEY, normalizedKey);
    } else {
      mainStorage.delete(SettingsKeys.TMDB_API_KEY);
    }
    mainStorage.setNumber(
      SettingsKeys.TMDB_API_KEY_REVISION,
      this.getTmdbApiKeyRevision() + 1,
    );
  }

  getTmdbApiKeyRevision(): number {
    return mainStorage.getNumber(SettingsKeys.TMDB_API_KEY_REVISION) || 0;
  }

  // Generic get/set methods for settings not covered by specific methods
  getBool(key: string, defaultValue = false): boolean {
    return mainStorage.getBool(key, defaultValue);
  }

  setBool(key: string, value: boolean): void {
    mainStorage.setBool(key, value);
  }
  // DNS over HTTPS
  isDohEnabled(): boolean {
    return mainStorage.getBool(SettingsKeys.DOH_ENABLED, true);
  }

  setDohEnabled(enabled: boolean): void {
    mainStorage.setBool(SettingsKeys.DOH_ENABLED, enabled);
  }

  getDohProvider(): string {
    return mainStorage.getString(SettingsKeys.DOH_PROVIDER) || 'cloudflare';
  }

  setDohProvider(provider: string): void {
    mainStorage.setString(SettingsKeys.DOH_PROVIDER, provider);
  }

  getDohCustomUrl(): string {
    return mainStorage.getString(SettingsKeys.DOH_CUSTOM_URL) || '';
  }

  setDohCustomUrl(url: string): void {
    mainStorage.setString(SettingsKeys.DOH_CUSTOM_URL, url);
  }
}

// Export a singleton instance
export const settingsStorage = new SettingsStorage();
