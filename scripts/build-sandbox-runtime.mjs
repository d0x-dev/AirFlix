// @ts-check
/**
 * Bundles the provider sandbox runtime into a single injectable string.
 *
 * Two passes:
 *  1. bundle the worker (provider execution realm, includes axios + cheerio)
 *  2. bundle the document (worker supervisor), inlining pass 1 as
 *     `__WORKER_SOURCE__` so the WebView needs no extra network or file access
 *
 * Output is committed as a generated .ts module so Metro can bundle it with the
 * app and no runtime file access is required.
 */
import {build} from 'esbuild';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, '..');
const runtimeDir = join(projectRoot, 'src', 'lib', 'sandbox', 'runtime');
const outFile = join(
  projectRoot,
  'src',
  'lib',
  'sandbox',
  'generated',
  'sandboxRuntime.generated.ts',
);

const shared = {
  bundle: true,
  format: /** @type {const} */ ('iife'),
  platform: /** @type {const} */ ('browser'),
  target: 'es2020',
  minify: true,
  write: false,
  legalComments: /** @type {const} */ ('none'),
  logLevel: /** @type {const} */ ('warning'),
};

const bundleFile = async (entry, define = {}) => {
  const result = await build({...shared, entryPoints: [entry], define});
  const output = result.outputFiles?.[0];
  if (!output) {
    throw new Error(`esbuild produced no output for ${entry}`);
  }
  return output.text;
};

const main = async () => {
  const workerSource = await bundleFile(join(runtimeDir, 'sandboxWorker.ts'));
  const documentSource = await bundleFile(
    join(runtimeDir, 'sandboxDocument.ts'),
    {
      __WORKER_SOURCE__: JSON.stringify(workerSource),
    },
  );

  mkdirSync(dirname(outFile), {recursive: true});
  writeFileSync(
    outFile,
    `// GENERATED FILE - do not edit.\n` +
      `// Produced by scripts/build-sandbox-runtime.mjs from src/lib/sandbox/runtime.\n` +
      `// Run \`npm run build:sandbox\` after changing the runtime sources.\n\n` +
      `export const SANDBOX_RUNTIME = ${JSON.stringify(documentSource)};\n`,
    'utf8',
  );

  const kb = (documentSource.length / 1024).toFixed(1);
  console.log(`sandbox runtime written to ${outFile} (${kb} KB)`);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
