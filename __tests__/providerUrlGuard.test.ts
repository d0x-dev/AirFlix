import {describe, expect, it} from '@jest/globals';
import {
  isPrivateHostname,
  isSafeExternalUrl,
  isSameSite,
  validateProviderUrl,
} from '../src/lib/sandbox/urlGuard';

describe('isPrivateHostname', () => {
  it('blocks loopback and local aliases', () => {
    [
      'localhost',
      'app.localhost',
      '127.0.0.1',
      '::1',
      '0.0.0.0',
      'nas.local',
    ].forEach(host => expect(isPrivateHostname(host)).toBe(true));
  });

  it('blocks private and link-local IPv4 ranges', () => {
    [
      '10.0.0.5',
      '192.168.1.1',
      '172.16.0.1',
      '172.31.255.255',
      '169.254.1.1',
    ].forEach(host => expect(isPrivateHostname(host)).toBe(true));
  });

  it('allows public hosts and public IPv4', () => {
    ['example.com', '8.8.8.8', '1.1.1.1', 'cdn.example.co.uk'].forEach(host =>
      expect(isPrivateHostname(host)).toBe(false),
    );
  });

  it('blocks IPv6 unique-local and link-local prefixes', () => {
    ['fd00::1', 'fc00::1', 'fe80::1'].forEach(host =>
      expect(isPrivateHostname(host)).toBe(true),
    );
  });
});

describe('validateProviderUrl', () => {
  it('accepts plain http and https urls', () => {
    expect(validateProviderUrl('https://example.com/a').hostname).toBe(
      'example.com',
    );
    expect(validateProviderUrl('http://example.com').protocol).toBe('http:');
  });

  it('rejects non-http schemes', () => {
    [
      'file:///etc/passwd',
      'javascript:alert(1)',
      'intent://x',
      'data:text/html,x',
    ].forEach(url => expect(() => validateProviderUrl(url)).toThrow());
  });

  it('rejects embedded credentials', () => {
    expect(() => validateProviderUrl('https://user:pass@example.com')).toThrow(
      /not allowed/,
    );
  });

  it('rejects private network targets', () => {
    expect(() => validateProviderUrl('http://192.168.0.1/admin')).toThrow(
      /not allowed/,
    );
  });

  it('rejects empty and non-string input', () => {
    [undefined, null, '', '   ', 42].forEach(value =>
      expect(() => validateProviderUrl(value)).toThrow(),
    );
  });
});

describe('isSafeExternalUrl', () => {
  it('allows only http and https', () => {
    expect(isSafeExternalUrl('https://example.com')).toBe(true);
    expect(isSafeExternalUrl('http://example.com')).toBe(true);
  });

  it('rejects schemes that would abuse the app authority', () => {
    [
      'intent://scan/#Intent;scheme=zxing;end',
      'javascript:alert(1)',
      'market://details?id=x',
      'tel:+15551234',
      'file:///sdcard/x',
      'httpx://example.com',
      'not a url',
      '',
    ].forEach(url => expect(isSafeExternalUrl(url)).toBe(false));
  });
});

describe('isSameSite', () => {
  it('matches identical and www-prefixed hosts', () => {
    expect(isSameSite('example.com', 'www.example.com')).toBe(true);
    expect(isSameSite('example.com', 'example.com')).toBe(true);
  });

  it('matches subdomains of the provider host', () => {
    expect(isSameSite('cdn.example.com', 'example.com')).toBe(true);
  });

  it('does not match unrelated hosts', () => {
    expect(isSameSite('evil.com', 'example.com')).toBe(false);
    expect(isSameSite('notexample.com', 'example.com')).toBe(false);
    expect(isSameSite('alice.github.io', 'bob.github.io')).toBe(false);
  });
});
