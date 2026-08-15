// Safe, optional accessors for react-native-firebase modules.
// They return null when the native modules aren't available (e.g., google-services.json missing).
export const getAnalytics = (): any | null => {
  try {
    return require('@react-native-firebase/analytics').default;
  } catch {
    return null;
  }
};

export const getCrashlytics = (): any | null => {
  try {
    return require('@react-native-firebase/crashlytics').default;
  } catch {
    return null;
  }
};

export const isFirebaseNativeReady = (): boolean => {
  try {
    // The config file can exist while android/ still comes from an older
    // prebuild. Only enable telemetry once a native default app is available.
    const firebase = require('@react-native-firebase/app').default;
    return Array.isArray(firebase?.apps) && firebase.apps.length > 0;
  } catch {
    return false;
  }
};
