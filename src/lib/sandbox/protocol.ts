export type RpcOperation = 'fetch' | 'getBaseUrl' | 'openWebView' | 'crypto';

export type SerializedBody =
  | {kind: 'none'}
  | {kind: 'text'; value: string}
  | {kind: 'base64'; value: string; contentType?: string};

export interface SerializedRequest {
  method?: string;
  headers: Array<[string, string]>;
  body: SerializedBody;
  redirect?: 'follow' | 'manual';
}

export interface SerializedResponse {
  status: number;
  statusText: string;
  url: string;
  headers: Array<[string, string]>;
  bodyBase64: string;
}

/** Native -> sandbox */
export type HostMessage =
  | {
      type: 'invoke';
      token: string;
      moduleCode: string;
      exportName?: string;
      args?: Record<string, unknown>;
      state: Record<string, unknown>;
      timeoutMs: number;
    }
  | {
      type: 'cancel';
      token: string;
    }
  | {
      type: 'rpc-result';
      token: string;
      id: number;
      result?: unknown;
      error?: string;
    };

/** Sandbox -> native */
export type SandboxMessage =
  | {type: 'ready'}
  | {
      type: 'rpc';
      token: string;
      id: number;
      operation: RpcOperation;
      args: unknown;
    }
  | {
      type: 'result';
      token: string;
      result?: unknown;
      error?: string;
      state?: Record<string, unknown>;
    }
  | {
      type: 'log';
      level: 'log' | 'warn' | 'error';
      message: string;
    };

export const SANDBOX_INVOKE_TIMEOUT_MS = 120_000;
export const MAX_MODULE_SIZE = 2_000_000;
export const MAX_RESPONSE_BYTES = 32 * 1024 * 1024;
export const MAX_STATE_BYTES = 256_000;
