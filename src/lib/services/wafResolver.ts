import {headers as commonHeaders} from '../providers/headers';
import type {
  OpenWebViewOptions,
  OpenWebViewResult,
} from '../providers/types';
import {useWafStore} from '../zustand/wafStore';
import {buildCookieString, getCookies, pickUserAgent, deleteCookie} from './cookieManager';

/**
 * Opens a dialog WebView so the user can solve a WAF / captcha challenge
 * (e.g. Cloudflare) for the given URL.
 *
 * This is exposed to providers via `providerContext.openWebView`. A provider
 * that detects a WAF response should call this with the blocked URL and the
 * request headers it would normally use (passed via `options.headers`), then
 * await the result. The WebView loads the page with those headers; once the
 * challenge is solved the provider receives the page response (rendered HTML)
 * in `result.data` along with the page cookies.
 *
 * Shortcuts:
 *  - If `options.waitForCookie` is already present for the URL, it resolves
 *    immediately with the existing cookies and does NOT open the dialog
 *    (`result.data` is empty in this case).
 *  - If `options.force` is set, the dialog is always opened (the shortcut
 *    above is skipped). The dialog still auto-closes as soon as the awaited
 *    cookie is present.
 *
 * The returned promise:
 *  - resolves with the page response (`data`) and cookies (including httpOnly
 *    cookies) once the user taps "Done" or the optional `waitForCookie` is
 *    detected.
 *  - rejects if the user cancels the dialog or the optional `timeoutMs` elapses.
 */
// Dictionary to store pending WAF resolution promises by URL/cookie
const pendingRequests: Record<string, Promise<OpenWebViewResult>> = {};

export const openWebView = (
  url: string,
  options?: OpenWebViewOptions,
): Promise<OpenWebViewResult> => {
  if (!url) {
    return Promise.reject(new Error('openWebView: a url is required'));
  }

  const userAgent =
    pickUserAgent(options?.headers) || commonHeaders['User-Agent'];

  // Extract domain/hostname so parallel requests to different paths on the same site are coalesced
  const hostname = url.includes('://') ? url.split('/')[2] : url;
  const cacheKey = options?.waitForCookie ? `${hostname}:${options.waitForCookie}` : hostname;
  
  // Request coalescing: if a WAF resolution is already pending for this URL/cookie, return its promise
  // We ALWAYS coalesce, even if force: true, to prevent multiple dialogs for the same domain
  if (cacheKey in pendingRequests) {
    return pendingRequests[cacheKey];
  }

  const execute = async (): Promise<OpenWebViewResult> => {
    // If not forced and the awaited cookie already exists, return it without a
    // dialog. In force mode we always open.
    if (!options?.force && options?.waitForCookie) {
      const cookieMap = await getCookies(url);
      if (cookieMap[options.waitForCookie]) {
        return {
          data: '',
          cookies: buildCookieString(cookieMap),
          cookieMap,
          url,
          userAgent,
        };
      }
    } else if (options?.waitForCookie) {
      // If it is forced, or if we are about to open the dialog, delete the old cookie
      // because it is either expired or invalid (caused a 403).
      await deleteCookie(url, options.waitForCookie);
    }

    return new Promise<OpenWebViewResult>((resolve, reject) => {
      useWafStore.getState().enqueue({
        url,
        resolve,
        reject,
        ...options,
      });
    });
  };

  const promise = execute();

  // Always register the promise for coalescing, even if force: true
  pendingRequests[cacheKey] = promise;

  promise.finally(() => {
    if (pendingRequests[cacheKey] === promise) {
      delete pendingRequests[cacheKey];
    }
  });

  return promise;
};
