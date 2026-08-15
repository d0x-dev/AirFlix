import React, {useCallback, useEffect, useRef} from 'react';
import {View} from 'react-native';
import {WebView} from 'react-native-webview';
import type {WebViewMessageEvent} from 'react-native-webview';
import {SANDBOX_RUNTIME} from '../lib/sandbox/generated/sandboxRuntime.generated';
import {sandboxBridge} from '../lib/sandbox/sandboxBridge';

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' blob:",
  'worker-src blob:',
  "connect-src 'none'",
  "img-src 'none'",
  "style-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const SANDBOX_ORIGIN = 'https://provider-sandbox.invalid/';

const escapeInlineScript = (runtime: string): string =>
  runtime
    .replace(/<\/script/gi, '<\\/script')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const buildHtml = (runtime: string): string => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
</head>
<body>
<script>${escapeInlineScript(runtime)}</script>
</body>
</html>`;

const ProviderSandboxHost = () => {
  const webViewRef = useRef<WebView>(null);

  const inject = useCallback((script: string) => {
    webViewRef.current?.injectJavaScript(script);
  }, []);

  const requestReload = useCallback(() => {
    sandboxBridge.handleReload();
    webViewRef.current?.reload();
  }, []);

  useEffect(() => {
    sandboxBridge.register(inject, requestReload);
    return () => sandboxBridge.unregister();
  }, [inject, requestReload]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    sandboxBridge.handleSandboxMessage(event.nativeEvent.data);
  }, []);

  return (
    <View
      pointerEvents="none"
      style={{width: 0, height: 0, opacity: 0, position: 'absolute'}}>
      <WebView
        ref={webViewRef}
        source={{html: buildHtml(SANDBOX_RUNTIME), baseUrl: SANDBOX_ORIGIN}}
        originWhitelist={['https://provider-sandbox.invalid']}
        javaScriptEnabled={true}
        domStorageEnabled={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        allowsFullscreenVideo={false}
        javaScriptCanOpenWindowsAutomatically={false}
        mediaPlaybackRequiresUserAction={true}
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled={false}
        cacheEnabled={false}
        incognito={true}
        setSupportMultipleWindows={false}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={request =>
          request.url === SANDBOX_ORIGIN || request.url === 'about:blank'
        }
        onRenderProcessGone={requestReload}
        onContentProcessDidTerminate={requestReload}
        style={{width: 0, height: 0}}
      />
    </View>
  );
};

export default ProviderSandboxHost;
