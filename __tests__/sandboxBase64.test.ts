import {describe, expect, it} from '@jest/globals';
import {
  base64ToBytes,
  base64ToUtf8,
  bytesToBase64,
  utf8ToBase64,
} from '../src/lib/sandbox/base64';

describe('sandbox base64 framing', () => {
  it('round-trips bytes of every padding length', () => {
    for (let length = 0; length <= 8; length++) {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        bytes[i] = (i * 37) % 256;
      }
      const restored = base64ToBytes(bytesToBase64(bytes));
      expect(Array.from(restored)).toEqual(Array.from(bytes));
    }
  });

  it('round-trips the full byte range', () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      bytes[i] = i;
    }
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(
      Array.from(bytes),
    );
  });

  it('matches known base64 vectors', () => {
    const encode = (text: string) =>
      bytesToBase64(new Uint8Array([...text].map(c => c.charCodeAt(0))));

    expect(encode('f')).toBe('Zg==');
    expect(encode('fo')).toBe('Zm8=');
    expect(encode('foo')).toBe('Zm9v');
    expect(encode('foob')).toBe('Zm9vYg==');
    expect(encode('hello world')).toBe('aGVsbG8gd29ybGQ=');
  });

  it('round-trips utf8 text including multi-byte characters', () => {
    const samples = [
      '',
      'plain ascii',
      '{"title":"Café"}',
      'emoji 🎬 and 日本語',
      'quotes " \' ` and backslash \\',
    ];
    samples.forEach(sample => {
      expect(base64ToUtf8(utf8ToBase64(sample))).toBe(sample);
    });
  });

  it('survives the line separators that would break script injection', () => {
    // U+2028/U+2029 are valid in JSON but terminate a JS line, so provider
    // data must not reach injectJavaScript unencoded.
    const hostile = 'a\u2028b\u2029c';
    const encoded = utf8ToBase64(JSON.stringify({hostile}));
    expect(encoded).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(base64ToUtf8(encoded)).hostile).toBe(hostile);
  });

  it('handles payloads larger than the chunk size', () => {
    const bytes = new Uint8Array(10_000);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = i % 251;
    }
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(
      Array.from(bytes),
    );
  });
});
