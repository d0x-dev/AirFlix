import * as Crypto from 'expo-crypto';
import {getBaseUrl} from '../providers/getBaseUrl';
import {openWebView} from '../services/wafResolver';
import type {OpenWebViewOptions, OpenWebViewResult} from '../providers/types';
import {bytesToBase64} from './base64';
import {providerFetch} from './providerFetch';
import type {RpcOperation, SerializedRequest} from './protocol';
import {validateProviderUrl} from './urlGuard';

const digestAlgorithms: Record<string, Crypto.CryptoDigestAlgorithm> = {
  MD5: Crypto.CryptoDigestAlgorithm.MD5,
  'SHA-1': Crypto.CryptoDigestAlgorithm.SHA1,
  'SHA-256': Crypto.CryptoDigestAlgorithm.SHA256,
  'SHA-384': Crypto.CryptoDigestAlgorithm.SHA384,
  'SHA-512': Crypto.CryptoDigestAlgorithm.SHA512,
};

const MAX_DIGEST_INPUT = 5 * 1024 * 1024;
const MAX_RANDOM_BYTES = 1024;

const handleCrypto = async (args: any): Promise<unknown> => {
  const method = String(args?.method ?? '');

  if (method === 'digestStringAsync') {
    const data = String(args?.data ?? '');
    if (data.length > MAX_DIGEST_INPUT) {
      throw new Error('Digest input is too large');
    }
    const algorithm = digestAlgorithms[String(args?.algorithm ?? 'SHA-256')];
    if (!algorithm) {
      throw new Error(`Unsupported digest algorithm: ${args?.algorithm}`);
    }
    return Crypto.digestStringAsync(algorithm, data, args?.options);
  }

  if (method === 'getRandomBytesAsync') {
    const byteCount = Number(args?.byteCount ?? 0);
    if (!Number.isInteger(byteCount) || byteCount <= 0) {
      throw new Error('byteCount must be a positive integer');
    }
    if (byteCount > MAX_RANDOM_BYTES) {
      throw new Error('byteCount is too large');
    }
    const bytes = await Crypto.getRandomBytesAsync(byteCount);
    return bytesToBase64(bytes);
  }

  throw new Error(`Unsupported crypto method: ${method}`);
};

const handleOpenWebView = async (
  providerValue: string,
  args: any,
): Promise<OpenWebViewResult> => {
  const url = validateProviderUrl(args?.url);
  const options = (args?.options ?? undefined) as
    | OpenWebViewOptions
    | undefined;

  const result = await openWebView(url.toString(), options);
  return {...result, cookie: result.cookies};
};

export const handleProviderRpc = async (
  providerValue: string,
  operation: RpcOperation,
  args: any,
): Promise<unknown> => {
  switch (operation) {
    case 'fetch':
      return providerFetch(
        args?.url,
        (args?.init ?? {
          headers: [],
          body: {kind: 'none'},
        }) as SerializedRequest,
      );

    case 'getBaseUrl':
      return getBaseUrl(String(args?.providerValue ?? providerValue));

    case 'openWebView':
      return handleOpenWebView(providerValue, args);

    case 'crypto':
      return handleCrypto(args);

    default:
      throw new Error(`Unsupported provider operation: ${operation}`);
  }
};
