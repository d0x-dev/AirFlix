import {getDomain} from 'tldts';

/**
 * Provider supplied URLs are untrusted. Everything the sandbox asks the native
 * host to fetch (or open in a WebView) passes through here first.
 *
 * Ported from `airflix-desktop/src/lib/services/ProviderManager.ts` with an extra
 * guard the desktop version lacks: redirect hops are re-validated by the
 * caller, because a public URL can otherwise 302 into the local network.
 */

const isPrivateIpv4 = (parts: number[]): boolean => {
  const [first, second] = parts;
  if (first === 10 || first === 127 || first === 0) {
    return true;
  }
  if (first === 169 && second === 254) {
    return true;
  }
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }
  if (first === 192 && second === 168) {
    return true;
  }
  if (first === 100 && second >= 64 && second <= 127) {
    return true;
  }
  // multicast and reserved
  return first >= 224;
};

export const isPrivateHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    normalized === '' ||
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized === '::' ||
    normalized === '0.0.0.0' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal')
  ) {
    return true;
  }

  const ipv4 = normalized.split('.');
  if (ipv4.length === 4) {
    const parts = ipv4.map(Number);
    if (
      parts.every(part => Number.isInteger(part) && part >= 0 && part <= 255)
    ) {
      return isPrivateIpv4(parts);
    }
  }

  if (normalized.includes(':')) {
    return (
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    );
  }

  return false;
};

/**
 * Only http/https, no embedded credentials, no private network targets.
 * Throws on anything else so the sandbox gets a plain rejection.
 */
export const validateProviderUrl = (value: unknown): URL => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Provider URL is required');
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Provider URL is not valid');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Provider URL is not allowed');
  }
  if (url.username || url.password) {
    throw new Error('Provider URL is not allowed');
  }
  if (isPrivateHostname(url.hostname)) {
    throw new Error('Provider URL is not allowed');
  }
  return url;
};

/**
 * Guard for URLs handed to `Linking.openURL`. Provider metadata reaches these
 * call sites, and on Android an attacker chosen scheme (`intent://`, `market://`,
 * `javascript:`) would run with the app's authority. Parse rather than prefix
 * match so `httpx://` and control character tricks fail closed.
 */
export const isSafeExternalUrl = (value: unknown): boolean => {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }
  try {
    const {protocol} = new URL(value.trim());
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

/** Public-suffix-aware compare used to scope `openWebView` to the provider site. */
export const isSameSite = (a: string, b: string): boolean => {
  const left = a.toLowerCase().replace(/^www\./, '');
  const right = b.toLowerCase().replace(/^www\./, '');
  if (left === right) {
    return true;
  }
  const leftDomain = getDomain(left, {allowPrivateDomains: true});
  const rightDomain = getDomain(right, {allowPrivateDomains: true});
  return Boolean(leftDomain && rightDomain && leftDomain === rightDomain);
};
