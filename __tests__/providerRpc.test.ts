import {beforeEach, describe, expect, it, jest} from '@jest/globals';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: {
    MD5: 'MD5',
    SHA1: 'SHA-1',
    SHA256: 'SHA-256',
    SHA384: 'SHA-384',
    SHA512: 'SHA-512',
  },
}));

jest.mock('../src/lib/providers/getBaseUrl', () => ({
  getBaseUrl: jest.fn(),
}));

jest.mock('../src/lib/services/wafResolver', () => ({
  openWebView: jest.fn(),
}));

jest.mock('../src/lib/sandbox/providerFetch', () => ({
  providerFetch: jest.fn(),
}));

import {handleProviderRpc} from '../src/lib/sandbox/providerRpc';
import {openWebView} from '../src/lib/services/wafResolver';

const mockOpenWebView = jest.mocked(openWebView);

describe('providerRpc openWebView', () => {
  beforeEach(() => {
    mockOpenWebView.mockReset();
  });

  it('returns cookies scoped to a validated third-party challenge URL', async () => {
    const result = {
      data: '<html></html>',
      cookies: 'cf_clearance=mobile-token',
      cookieMap: {cf_clearance: 'mobile-token'},
      userAgent: 'Airflix Test',
      url: 'https://drive.example.com',
    };
    mockOpenWebView.mockResolvedValue(result);

    await expect(
      handleProviderRpc('uhd', 'openWebView', {
        url: result.url,
        options: {waitForCookie: 'cf_clearance'},
      }),
    ).resolves.toEqual({...result, cookie: result.cookies});
    expect(mockOpenWebView).toHaveBeenCalledWith(`${result.url}/`, {
      waitForCookie: 'cf_clearance',
    });
  });
});
