import {
  MAX_MODULE_SIZE,
  SANDBOX_INVOKE_TIMEOUT_MS,
  type HostMessage,
  type SandboxMessage,
} from './protocol';
import {utf8ToBase64} from './base64';
import {handleProviderRpc} from './providerRpc';

/**
 * Native side transport for the provider sandbox.
 *
 * Owns the single hidden WebView that hosts provider workers, correlates
 * invokes by token, relays RPC frames, and enforces the invoke timeout from the
 * native side as a backstop to the document's own timer.
 */

type Injector = (script: string) => void;

interface PendingInvoke {
  providerValue: string;
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  onAbort?: () => void;
  signal?: AbortSignal;
}

const randomToken = (): string => {
  let token = '';
  for (let i = 0; i < 4; i++) {
    token += Math.random().toString(36).slice(2, 10);
  }
  return token;
};

class SandboxBridge {
  private injector: Injector | null = null;
  private ready = false;
  private readonly queue: HostMessage[] = [];
  private readonly pending = new Map<string, PendingInvoke>();
  private reloadRequester: (() => void) | null = null;
  private readyTimer: ReturnType<typeof setTimeout> | null = null;

  /** Called by the host component once the WebView is mounted. */
  register(injector: Injector, requestReload: () => void): void {
    this.injector = injector;
    this.reloadRequester = requestReload;
    this.startReadyTimer();
  }

  unregister(): void {
    this.injector = null;
    this.ready = false;
    if (this.readyTimer) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }
    this.queue.length = 0;
    for (const [token, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.signal?.removeEventListener?.('abort', entry.onAbort as never);
      entry.reject(new Error('Provider sandbox was torn down'));
      this.pending.delete(token);
    }
  }

  private post(message: HostMessage): void {
    if (!this.injector || !this.ready) {
      this.queue.push(message);
      return;
    }
    // base64 so no quote or U+2028/U+2029 in provider data can break out of
    // the injected script.
    const encoded = utf8ToBase64(JSON.stringify(message));
    this.injector(`window.__sandboxReceive("${encoded}");true;`);
  }

  private flush(): void {
    if (!this.ready) {
      return;
    }
    const queued = this.queue.splice(0, this.queue.length);
    for (const message of queued) {
      this.post(message);
    }
  }

  private startReadyTimer(): void {
    if (this.readyTimer) {
      clearTimeout(this.readyTimer);
    }
    this.readyTimer = setTimeout(() => {
      this.readyTimer = null;
      if (this.ready) {
        return;
      }
      this.queue.length = 0;
      for (const token of Array.from(this.pending.keys())) {
        this.settle(token, new Error('Provider sandbox failed to start'));
      }
    }, 15_000);
  }

  private settle(token: string, error: Error | null, result?: unknown): void {
    const entry = this.pending.get(token);
    if (!entry) {
      return;
    }
    this.pending.delete(token);
    clearTimeout(entry.timer);
    if (entry.onAbort && entry.signal) {
      entry.signal.removeEventListener('abort', entry.onAbort);
    }
    if (error) {
      entry.reject(error);
    } else {
      entry.resolve(result);
    }
  }

  /** WebView `onMessage` handler. */
  handleSandboxMessage = (raw: string): void => {
    let message: SandboxMessage;
    try {
      message = JSON.parse(raw) as SandboxMessage;
    } catch {
      return;
    }
    if (!message || typeof message !== 'object') {
      return;
    }

    switch (message.type) {
      case 'ready':
        this.ready = true;
        if (this.readyTimer) {
          clearTimeout(this.readyTimer);
          this.readyTimer = null;
        }
        this.flush();
        return;

      case 'log':
        if (message.level === 'error') {
          console.error('[provider sandbox]', message.message);
        } else {
          console.log('[provider sandbox]', message.message);
        }
        return;

      case 'rpc': {
        const entry = this.pending.get(message.token);
        if (!entry) {
          return;
        }
        handleProviderRpc(entry.providerValue, message.operation, message.args)
          .then(result => {
            this.post({
              type: 'rpc-result',
              token: message.token,
              id: message.id,
              result,
            });
          })
          .catch(error => {
            this.post({
              type: 'rpc-result',
              token: message.token,
              id: message.id,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        return;
      }

      case 'result':
        if (message.error) {
          this.settle(message.token, new Error(message.error));
        } else {
          const entry = this.pending.get(message.token);
          if (entry && message.state) {
            onStateSaved?.(entry.providerValue, message.state);
          }
          this.settle(message.token, null, message.result);
        }
        return;
    }
  };

  invoke<T>(params: {
    moduleCode: string;
    providerValue: string;
    exportName?: string;
    args?: Record<string, unknown>;
    state: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<T> {
    const {moduleCode, providerValue, exportName, args, state, signal} = params;

    if (moduleCode.length > MAX_MODULE_SIZE) {
      return Promise.reject(new Error('Provider module is too large'));
    }
    if (signal?.aborted) {
      return Promise.reject(new Error('Provider request aborted'));
    }

    const token = randomToken();

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        // The document normally terminates the worker itself; if the whole
        // WebView is wedged, reload it so later calls are not stuck forever.
        this.settle(token, new Error(`Provider ${providerValue} timed out`));
        this.reloadRequester?.();
      }, SANDBOX_INVOKE_TIMEOUT_MS + 5_000);

      const onAbort = () => {
        this.post({type: 'cancel', token});
        this.settle(token, new Error('Provider request aborted'));
      };
      signal?.addEventListener('abort', onAbort, {once: true});

      this.pending.set(token, {
        providerValue,
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
        onAbort,
        signal,
      });

      this.post({
        type: 'invoke',
        token,
        moduleCode,
        exportName,
        args,
        state,
        timeoutMs: SANDBOX_INVOKE_TIMEOUT_MS,
      });
    });
  }

  /** Called by the host component when the WebView reloads. */
  handleReload(): void {
    this.ready = false;
    this.startReadyTimer();
  }
}

let onStateSaved:
  | ((providerValue: string, state: Record<string, unknown>) => void)
  | null = null;

/** ProviderManager registers here so provider state survives across invokes. */
export const setSandboxStateHandler = (
  handler: (providerValue: string, state: Record<string, unknown>) => void,
): void => {
  onStateSaved = handler;
};

export const sandboxBridge = new SandboxBridge();
