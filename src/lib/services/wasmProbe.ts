/**
 * WASM-in-Hermes probe.
 *
 * Purpose: determine, at runtime on-device, whether the Hermes engine shipped
 * with this React Native version actually supports WebAssembly well enough to
 * run a WASM-based JS sandbox engine such as `quickjs-emscripten`.
 *
 * Background: as of RN 0.84+, WebAssembly support in Hermes was announced but
 * shipped as experimental groundwork rather than a stable, default-on feature.
 * A version number alone does not confirm it works. This probe replaces that
 * assumption with a concrete yes/no you can read from the running app.
 *
 * How to use: call `runWasmProbe()` early in app startup (e.g. from a dev-only
 * screen or a temporary effect in `App.tsx`) and inspect the returned report /
 * console output. It is side-effect free apart from logging and does not touch
 * provider execution. Remove once the question is answered.
 */

export interface WasmProbeReport {
  /** Whether the `WebAssembly` global exists at all. */
  hasWebAssemblyGlobal: boolean;
  /** Whether the core WebAssembly constructors/functions are present. */
  hasCoreApi: boolean;
  /** Whether a minimal module compiled + instantiated successfully. */
  instantiated: boolean;
  /** Whether an exported function executed and returned the expected value. */
  executed: boolean;
  /** The value returned by the exported `add(2, 3)` function, if it ran. */
  addResult: number | null;
  /** Any error encountered during compile/instantiate/execute. */
  error: string | null;
  /** Overall verdict: is quickjs-emscripten realistically runnable here? */
  viable: boolean;
}

/**
 * A minimal valid WebAssembly module (WAT source shown below), hand-encoded as
 * bytes. It exports a single function `add(a, b) => a + b`.
 *
 *   (module
 *     (func (export "add") (param i32 i32) (result i32)
 *       local.get 0
 *       local.get 1
 *       i32.add))
 */
const ADD_MODULE_BYTES = new Uint8Array([
  0x00,
  0x61,
  0x73,
  0x6d, // magic: "\0asm"
  0x01,
  0x00,
  0x00,
  0x00, // version: 1
  // Type section: one type () -> (i32, i32) => i32
  0x01,
  0x07,
  0x01,
  0x60,
  0x02,
  0x7f,
  0x7f,
  0x01,
  0x7f,
  // Function section: one function of type 0
  0x03,
  0x02,
  0x01,
  0x00,
  // Export section: export "add" as func 0
  0x07,
  0x07,
  0x01,
  0x03,
  0x61,
  0x64,
  0x64,
  0x00,
  0x00,
  // Code section: local.get 0; local.get 1; i32.add; end
  0x0a,
  0x09,
  0x01,
  0x07,
  0x00,
  0x20,
  0x00,
  0x20,
  0x01,
  0x6a,
  0x0b,
]);

/**
 * Runs the probe and returns a structured report. Also logs a readable summary
 * so it is visible in Metro / device logs without wiring up any UI.
 */
export async function runWasmProbe(): Promise<WasmProbeReport> {
  const report: WasmProbeReport = {
    hasWebAssemblyGlobal: false,
    hasCoreApi: false,
    instantiated: false,
    executed: false,
    addResult: null,
    error: null,
    viable: false,
  };

  try {
    const WA: any = (globalThis as any).WebAssembly;
    report.hasWebAssemblyGlobal = typeof WA !== 'undefined';

    if (!report.hasWebAssemblyGlobal) {
      report.error = 'WebAssembly global is not defined in this engine.';
      logReport(report);
      return report;
    }

    report.hasCoreApi =
      typeof WA.instantiate === 'function' &&
      typeof WA.Module === 'function' &&
      typeof WA.Instance === 'function';

    if (!report.hasCoreApi) {
      report.error =
        'WebAssembly global exists but core API (instantiate/Module/Instance) is incomplete.';
      logReport(report);
      return report;
    }

    // Compile + instantiate the minimal module.
    const result = await WA.instantiate(ADD_MODULE_BYTES);
    const instance = result.instance ?? result;
    report.instantiated = !!instance && !!instance.exports;

    if (report.instantiated && typeof instance.exports.add === 'function') {
      const value = instance.exports.add(2, 3);
      report.addResult = value;
      report.executed = value === 5;
    } else {
      report.error =
        'Instantiated, but exported "add" function was not callable.';
    }

    report.viable = report.executed;
  } catch (e: any) {
    report.error = e?.message ? String(e.message) : String(e);
  }

  logReport(report);
  return report;
}

function logReport(report: WasmProbeReport): void {
  const verdict = report.viable
    ? 'VIABLE: WebAssembly runs — quickjs-emscripten is worth a real integration spike.'
    : 'NOT VIABLE (yet): WebAssembly did not fully work in this engine.';

  // eslint-disable-next-line no-console
  console.log(
    '[wasm-probe] ' + JSON.stringify(report) + '\n[wasm-probe] ' + verdict,
  );
}
