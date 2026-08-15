import {describe, expect, it} from '@jest/globals';
import {
  getErrorMessage,
  serializeBody,
} from '../src/lib/sandbox/runtime/runtimeSupport';

describe('sandbox runtime body serialization', () => {
  it('preserves multipart FormData bytes and boundary', async () => {
    const body = new FormData();
    body.append('token', 'abc123');
    body.append('action', 'download');

    const serialized = await serializeBody(body);

    expect(serialized).toEqual(
      expect.objectContaining({
        kind: 'base64',
        contentType: expect.stringContaining('multipart/form-data; boundary='),
      }),
    );
    expect(serialized.kind === 'base64' && serialized.value).toBeTruthy();
  });

  it('preserves URLSearchParams as urlencoded text', async () => {
    const body = new URLSearchParams({token: 'abc123', action: 'download'});

    await expect(serializeBody(body)).resolves.toEqual({
      kind: 'text',
      value: 'token=abc123&action=download',
    });
  });
});

describe('sandbox runtime error serialization', () => {
  it('preserves Error and string messages', () => {
    expect(getErrorMessage(new Error('provider failed'))).toBe(
      'provider failed',
    );
    expect(getErrorMessage('provider failed')).toBe('provider failed');
  });

  it('serializes plain thrown objects instead of returning object Object', () => {
    expect(
      getErrorMessage({response: {status: 429}, message: 'rate limited'}),
    ).toBe('{"response":{"status":429},"message":"rate limited"}');
  });
});
