import 'react-native';
import type {AppText} from 'react-native/Libraries/Text/Text';

declare module 'react-native' {
  /** React Native 0.86 compatibility declarations expose this as AppText. */
  export const Text: typeof AppText;
}
