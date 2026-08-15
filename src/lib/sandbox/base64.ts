/* eslint-disable no-bitwise -- base64 encoding is defined in bit groups */
const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const DECODE_TABLE: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) {
  DECODE_TABLE[ALPHABET[i]] = i;
}

const CHUNK_SIZE = 3 * 1024;

export const bytesToBase64 = (bytes: Uint8Array): string => {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const end = Math.min(offset + CHUNK_SIZE, bytes.length);
    let chunk = '';
    for (let i = offset; i < end; i += 3) {
      const b0 = bytes[i];
      const has1 = i + 1 < end;
      const has2 = i + 2 < end;
      const b1 = has1 ? bytes[i + 1] : 0;
      const b2 = has2 ? bytes[i + 2] : 0;
      chunk += ALPHABET[b0 >> 2];
      chunk += ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
      chunk += has1 ? ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=';
      chunk += has2 ? ALPHABET[b2 & 0x3f] : '=';
    }
    chunks.push(chunk);
  }
  return chunks.join('');
};

export const base64ToBytes = (value: string): Uint8Array => {
  const clean = value.replace(/[^A-Za-z0-9+/]/g, '');
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(Math.max(byteLength, 0));

  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = DECODE_TABLE[clean[i]] ?? 0;
    const c1 = DECODE_TABLE[clean[i + 1]] ?? 0;
    const c2 = DECODE_TABLE[clean[i + 2]] ?? 0;
    const c3 = DECODE_TABLE[clean[i + 3]] ?? 0;

    if (byteIndex < bytes.length) {
      bytes[byteIndex++] = (c0 << 2) | (c1 >> 4);
    }
    if (byteIndex < bytes.length) {
      bytes[byteIndex++] = ((c1 & 0x0f) << 4) | (c2 >> 2);
    }
    if (byteIndex < bytes.length) {
      bytes[byteIndex++] = ((c2 & 0x03) << 6) | c3;
    }
  }
  return bytes;
};

const textEncoderAvailable = typeof TextEncoder !== 'undefined';

export const utf8ToBase64 = (value: string): string => {
  if (textEncoderAvailable) {
    return bytesToBase64(new TextEncoder().encode(value));
  }
  const bytes: number[] = [];
  for (const char of unescape(encodeURIComponent(value))) {
    bytes.push(char.charCodeAt(0));
  }
  return bytesToBase64(new Uint8Array(bytes));
};

export const base64ToUtf8 = (value: string): string => {
  const bytes = base64ToBytes(value);
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes);
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return decodeURIComponent(escape(binary));
};
/* eslint-enable no-bitwise */
