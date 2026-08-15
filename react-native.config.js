const fs = require('fs');
const path = require('path');

const androidGoogleServicesFile = './google-services.json';
const hasAndroidGoogleServices = fs.existsSync(
  path.resolve(__dirname, androidGoogleServicesFile)
);

const iosGoogleServicesFile = './GoogleService-Info.plist';
const hasIosGooglePlist = fs.existsSync(
  path.resolve(__dirname, iosGoogleServicesFile)
);

const disableFirebase = {
  android: hasAndroidGoogleServices ? undefined : null,
  ios: hasIosGooglePlist ? undefined : null,
};

module.exports = {
  dependencies: {
    '@react-native-firebase/app': {
      platforms: disableFirebase,
    },
    '@react-native-firebase/analytics': {
      platforms: disableFirebase,
    },
    '@react-native-firebase/crashlytics': {
      platforms: disableFirebase,
    },
  },
  assets: ['./assets/fonts/'],
};
