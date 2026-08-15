import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  StyleSheet,
} from 'react-native';
import {WebView, WebViewMessageEvent} from 'react-native-webview';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {useWafStore, WafRequest} from '../lib/zustand/wafStore';
import {headers as commonHeaders} from '../lib/providers/headers';
import type {OpenWebViewResult} from '../lib/providers/types';
import {
  buildCookieString,
  getCookies,
  pickUserAgent,
} from '../lib/services/cookieManager';
import {useM3Colors} from '../theme/M3PaletteContext';
import AppText from './ui/Text';

const GRAB_HTML_JS =
  '(function(){try{window.ReactNativeWebView.postMessage(JSON.stringify({__waf:true,html:document.documentElement.outerHTML}));}catch(e){}})(); true;';

const WafWebViewDialog = () => {
  const request = useWafStore(state => state.requests[0]);
  const remove = useWafStore(state => state.remove);
  const {primary, onPrimary} = useM3Colors();

  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  // Guards against settling the same request more than once.
  const settledRef = useRef(false);
  // Latest captured page HTML.
  const htmlRef = useRef('');
  // Set while waiting for a fresh HTML capture before resolving.
  const pendingResolveRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialCookiesRef = useRef<Record<string, string>>({});
  const webViewReadyRef = useRef(false);

  const userAgent =
    pickUserAgent(request?.headers) || commonHeaders['User-Agent'];

  // Reset transient state whenever a new request becomes active.
  useEffect(() => {
    settledRef.current = false;
    pendingResolveRef.current = false;
    htmlRef.current = '';
    setLoading(true);
    webViewReadyRef.current = false;
    initialCookiesRef.current = {};
    let cancelled = false;

    // Snapshot existing cookies so we only auto-resolve on NEW/UPDATED ones
    if (request) {
      (async () => {
        const cookieMap = await getCookies(request.url);
        if (!cancelled) {
          initialCookiesRef.current = cookieMap;
          webViewReadyRef.current = true;
        }
      })();
    }
  }, [request?.id]);

  // Resolve the active request with the captured page response + cookies.
  const finalizeResolve = useCallback(
    async (req: WafRequest) => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      try {
        const cookieMap = await getCookies(req.url);
        const cookies = buildCookieString(cookieMap);
        const result: OpenWebViewResult = {
          data: htmlRef.current,
          cookies,
          cookieMap,
          url: req.url,
          userAgent,
        };
        req.resolve(result);
      } catch (e) {
        req.reject(
          e instanceof Error ? e : new Error('Failed to read page response'),
        );
      } finally {
        remove(req.id);
      }
    },
    [remove, userAgent],
  );

  const cancel = useCallback(() => {
    if (!request || settledRef.current) {
      return;
    }
    settledRef.current = true;
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    request.reject(new Error('WAF_DIALOG_CANCELLED'));
    remove(request.id);
  }, [request, remove]);

  const resolveWithPage = useCallback(() => {
    if (!request || settledRef.current) {
      return;
    }
    settledRef.current = true;
    const req = request;
    pendingResolveRef.current = true;
    webViewRef.current?.injectJavaScript(GRAB_HTML_JS);
    fallbackTimerRef.current = setTimeout(() => {
      if (pendingResolveRef.current) {
        pendingResolveRef.current = false;
        finalizeResolve(req);
      }
    }, 1200);
  }, [request, finalizeResolve]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg && msg.__waf && typeof msg.html === 'string') {
          htmlRef.current = msg.html;
          if (pendingResolveRef.current && request) {
            pendingResolveRef.current = false;
            finalizeResolve(request);
          }
        }
      } catch {}
    },
    [request, finalizeResolve],
  );

  useEffect(() => {
    const cookieName = request?.waitForCookie;
    const url = request?.url;
    if (!cookieName || !url) {
      return;
    }
    let cancelled = false;

    const poll = async () => {
      if (cancelled || settledRef.current || !webViewReadyRef.current) {
        return;
      }
      const cookieMap = await getCookies(url);
      if (
        cookieMap[cookieName] &&
        cookieMap[cookieName] !== initialCookiesRef.current[cookieName]
      ) {
        resolveWithPage();
      }
    };

    poll();
    const interval = setInterval(poll, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [request?.id, request?.waitForCookie, request?.url, resolveWithPage]);

  // Hardware back button cancels the dialog.
  useEffect(() => {
    if (!request) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      cancel();
      return true;
    });
    return () => sub.remove();
  }, [request, cancel]);

  // Optional timeout cancels the dialog.
  useEffect(() => {
    if (!request?.timeoutMs) {
      return;
    }
    const timer = setTimeout(() => cancel(), request.timeoutMs);
    return () => clearTimeout(timer);
  }, [request, cancel]);

  if (!request) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      visible={true}
      transparent={true}
      onRequestClose={cancel}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View
          className="bg-tertiary rounded-2xl overflow-hidden w-full"
          style={{height: '80%', maxWidth: 560}}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3">
            <View className="flex-1 pr-2">
              <AppText
                className="text-white text-base font-bold"
                numberOfLines={1}>
                {request.title || 'Verify you are human'}
              </AppText>
              <AppText className="text-white/60 text-xs" numberOfLines={2}>
                {request.description ||
                  'Complete the challenge below, then tap Done.'}
              </AppText>
            </View>
            <TouchableOpacity onPress={cancel} className="p-1">
              <MaterialIcons name="close" size={22} color="#c1c4c9" />
            </TouchableOpacity>
          </View>

          {/* WebView */}
          <View className="flex-1">
            <WebView
              ref={webViewRef}
              source={{uri: request.url, headers: request.headers}}
              userAgent={userAgent}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              thirdPartyCookiesEnabled={true}
              sharedCookiesEnabled={true}
              originWhitelist={['*']}
              injectedJavaScript={GRAB_HTML_JS}
              onMessage={onMessage}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => {
                setLoading(false);
                webViewRef.current?.injectJavaScript(GRAB_HTML_JS);
              }}
            />
            {loading && (
              <View
                style={StyleSheet.absoluteFill}
                className="items-center justify-center bg-black/30">
                <ActivityIndicator size="large" color={primary} />
              </View>
            )}
          </View>

          {/* Footer */}
          <View className="flex-row items-center gap-3 px-4 py-3">
            <TouchableOpacity
              onPress={() => webViewRef.current?.reload()}
              className="px-4 py-2 rounded-md bg-white/10">
              <AppText className="text-white text-sm">Reload</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={resolveWithPage}
              className="flex-1 px-4 py-2 rounded-md items-center"
              style={{backgroundColor: primary}}>
              <AppText
                style={{color: onPrimary}}
                className="text-sm font-semibold">
                Done
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default WafWebViewDialog;
