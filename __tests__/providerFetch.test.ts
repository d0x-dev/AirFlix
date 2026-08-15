import {beforeEach, describe, expect, it, jest} from '@jest/globals';

jest.mock('axios', () => ({
  __esModule: true,
  default: {request: jest.fn()},
}));

jest.mock('../src/lib/services/cookieManager', () => ({
  getCookieHeader: jest.fn(),
}));

jest.mock('../src/lib/sandbox/rateLimiter', () => ({
  providerRateLimiter: {
    acquire: jest.fn(async () => jest.fn()),
  },
}));

import axios from 'axios';
import {getCookieHeader} from '../src/lib/services/cookieManager';
import {providerFetch} from '../src/lib/sandbox/providerFetch';

const mockAxiosRequest = jest.mocked(axios.request);
const mockGetCookieHeader = jest.mocked(getCookieHeader);

const emptyRequest = {
  method: 'POST',
  headers: [] as Array<[string, string]>,
  body: {kind: 'none' as const},
};

describe('providerFetch cookies', () => {
  beforeEach(() => {
    mockAxiosRequest.mockReset();
    mockGetCookieHeader.mockReset();
    mockGetCookieHeader.mockResolvedValue('');
    mockAxiosRequest.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: {},
      data: new Uint8Array(0),
      request: {responseURL: 'https://drive.example.com/form'},
    });
  });

  it('injects cookies scoped to the request URL', async () => {
    mockGetCookieHeader.mockResolvedValue('session=mobile-token');

    await providerFetch('https://drive.example.com/form', emptyRequest);

    expect(mockGetCookieHeader).toHaveBeenCalledWith(
      'https://drive.example.com/form',
    );
    expect(mockAxiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({Cookie: 'session=mobile-token'}),
      }),
    );
  });

  it('does not replace a provider supplied cookie header', async () => {
    mockGetCookieHeader.mockResolvedValue('session=native-token');

    await providerFetch('https://drive.example.com/form', {
      ...emptyRequest,
      headers: [['cookie', 'session=provider-token']],
    });

    expect(mockAxiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          cookie: 'session=provider-token',
        }),
      }),
    );
  });

  it('adds native companion cookies to a provider supplied WAF cookie', async () => {
    mockGetCookieHeader.mockResolvedValue(
      'cf_clearance=native-token; wordpress_test_cookie=WP%20Cookie%20check',
    );

    await providerFetch('https://cinevood.example/hollywood/', {
      ...emptyRequest,
      headers: [['Cookie', 'cf_clearance=provider-token']],
    });

    expect(mockAxiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie:
            'cf_clearance=provider-token; wordpress_test_cookie=WP%20Cookie%20check',
        }),
      }),
    );
  });
});
