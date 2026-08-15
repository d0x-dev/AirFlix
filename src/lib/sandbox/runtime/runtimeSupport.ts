import {base64ToBytes, bytesToBase64} from '../base64';
import type {RpcOperation, SerializedBody} from '../protocol';

export type RuntimeRpc = <T>(
  operation: RpcOperation,
  args: unknown,
) => Promise<T>;

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export const serializeBody = async (body: unknown): Promise<SerializedBody> => {
  if (body == null) {
    return {kind: 'none'};
  }
  if (typeof body === 'string') {
    return {kind: 'text', value: body};
  }
  if (body instanceof Uint8Array) {
    return {kind: 'base64', value: bytesToBase64(body)};
  }
  if (body instanceof ArrayBuffer) {
    return {kind: 'base64', value: bytesToBase64(new Uint8Array(body))};
  }
  if (
    typeof URLSearchParams !== 'undefined' &&
    body instanceof URLSearchParams
  ) {
    return {kind: 'text', value: body.toString()};
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const serialized = new Response(body);
    const bytes = new Uint8Array(await serialized.arrayBuffer());
    return {
      kind: 'base64',
      value: bytesToBase64(bytes),
      contentType: serialized.headers.get('content-type') ?? undefined,
    };
  }
  try {
    return {kind: 'text', value: JSON.stringify(body) ?? ''};
  } catch {
    return {kind: 'text', value: String(body)};
  }
};

/** expo-crypto lives on the native side, so expose it as RPC shims. */
export const createCryptoShim = (rpc: RuntimeRpc) =>
  Object.freeze({
    CryptoDigestAlgorithm: Object.freeze({
      SHA1: 'SHA-1',
      SHA256: 'SHA-256',
      SHA384: 'SHA-384',
      SHA512: 'SHA-512',
      MD5: 'MD5',
    }),
    CryptoEncoding: Object.freeze({HEX: 'hex', BASE64: 'base64'}),
    digestStringAsync: (algorithm: string, data: string, options?: unknown) =>
      rpc<string>('crypto', {
        method: 'digestStringAsync',
        algorithm,
        data,
        options,
      }),
    getRandomBytesAsync: async (byteCount: number) => {
      const base64 = await rpc<string>('crypto', {
        method: 'getRandomBytesAsync',
        byteCount,
      });
      return base64ToBytes(base64);
    },
    randomUUID: () => {
      // Synchronous by contract; this is used for identifiers, not secrets.
      const hex = '0123456789abcdef';
      let uuid = '';
      for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
          uuid += '-';
        } else if (i === 14) {
          uuid += '4';
        } else {
          uuid += hex[Math.floor(Math.random() * 16)];
        }
      }
      return uuid;
    },
  });

/** TypeScript's helper emitted for transpiled async functions. */
export const createAwaiter = () =>
  function __awaiter(
    thisArg: unknown,
    args: unknown,
    PromiseConstructor: PromiseConstructor | undefined,
    generator: (...generatorArgs: unknown[]) => Generator,
  ) {
    const Constructor = PromiseConstructor ?? Promise;
    const adopt = (value: unknown) =>
      value instanceof Constructor
        ? value
        : new Constructor(resolve => resolve(value));
    return new Constructor((resolve, reject) => {
      const fulfilled = (value: unknown) => {
        try {
          step(iterator.next(value));
        } catch (error) {
          reject(error);
        }
      };
      const rejected = (value: unknown) => {
        try {
          step(iterator.throw(value));
        } catch (error) {
          reject(error);
        }
      };
      const step = (result: IteratorResult<unknown>) => {
        if (result.done) {
          resolve(result.value);
        } else {
          adopt(result.value).then(fulfilled, rejected);
        }
      };
      const iterator = generator.apply(thisArg, (args as unknown[]) ?? []);
      step(iterator.next());
    });
  };
