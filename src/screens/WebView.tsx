import {
  BackHandler,
  View,
  SafeAreaView,
  Linking,
  ToastAndroid,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {WebView} from 'react-native-webview';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {HomeStackParamList} from '../App';
import {isSafeExternalUrl} from '../lib/sandbox/urlGuard';
import IconButton from '../components/ui/IconButton';
import AppText from '../components/ui/Text';

type Props = NativeStackScreenProps<HomeStackParamList, 'Webview'>;

const Webview = ({route, navigation}: Props) => {
  const link = isSafeExternalUrl(route.params.link) ? route.params.link : '';
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(link);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!canGoBack) {
          return false;
        }
        webViewRef.current?.goBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [canGoBack]);

  const openExternally = () => {
    if (!isSafeExternalUrl(currentUrl)) {
      ToastAndroid.show('Unsupported link', ToastAndroid.SHORT);
      return;
    }
    Linking.openURL(currentUrl);
  };

  return (
    <SafeAreaView className="h-full w-full bg-m3-background">
      <View className="mt-6 h-16 w-full flex-row items-center justify-between bg-m3-surface-container px-4">
        <AppText role="titleLargeEmphasized" className="text-m3-on-surface">
          Web
        </AppText>
        <View className="flex-row items-center gap-2">
          <IconButton
            disabled={!canGoBack}
            icon="arrow-left"
            label="Go back"
            onPress={() => webViewRef.current?.goBack()}
          />
          <IconButton
            disabled={!canGoForward}
            icon="arrow-right"
            label="Go forward"
            onPress={() => webViewRef.current?.goForward()}
          />
          <IconButton
            icon="open-in-new"
            label="Open in browser"
            onPress={openExternally}
          />
          <IconButton
            icon="close"
            label="Close web view"
            onPress={() => {
              navigation.goBack();
            }}
          />
        </View>
      </View>
      {link ? (
        <WebView
          ref={webViewRef}
          domStorageEnabled
          javaScriptEnabled
          onNavigationStateChange={state => {
            setCanGoBack(state.canGoBack);
            setCanGoForward(state.canGoForward);
            if (isSafeExternalUrl(state.url)) {
              setCurrentUrl(state.url);
            }
          }}
          onShouldStartLoadWithRequest={request =>
            request.url === 'about:blank' || isSafeExternalUrl(request.url)
          }
          setSupportMultipleWindows={false}
          source={{uri: link}}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <AppText role="bodyLarge" className="text-m3-on-surface-variant">
            Unsupported link
          </AppText>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Webview;
