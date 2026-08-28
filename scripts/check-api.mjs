/**
 * Serverless smoke check.
 *
 * Imports every function in `api/` under native Node ESM — the same resolver
 * Vercel uses in production, and a stricter one than Vite's bundler resolution.
 * It only *loads* each module; no handler is invoked and no network call is made.
 *
 * Why this exists: `api/ask.js` shipped a 500 (FUNCTION_INVOCATION_FAILED) for
 * every request because a transitive import used an extensionless specifier
 * (`'../data/cvData'`). Native ESM requires the extension, so the module threw
 * ERR_MODULE_NOT_FOUND before the handler ran. Vite resolved it happily, so the
 * browser build was fine and `vite dev` could never reproduce it — `api/` does
 * not run under `vite dev` at all.
 *
 * Runs on `prebuild`, so a function that cannot even be imported fails the build
 * instead of reaching production.
 */
import { readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_DIR = resolve(ROOT, 'api');

let entries;
try {
    entries = await readdir(API_DIR);
} catch {
    console.log('check:api — no api/ directory, nothing to check');
    process.exit(0);
}

const functions = entries.filter((f) => f.endsWith('.js') || f.endsWith('.mjs'));
if (functions.length === 0) {
    console.log('check:api — no serverless functions found');
    process.exit(0);
}

const failures = [];

for (const file of functions) {
    const path = resolve(API_DIR, file);
    try {
        const mod = await import(pathToFileURL(path).href);
        if (typeof mod.default !== 'function') {
            failures.push(`api/${file}: loads, but has no default-exported handler function`);
            continue;
        }
        console.log(`  ok  api/${file}`);
    } catch (error) {
        failures.push(`api/${file}: ${error.code ?? 'ERROR'} — ${error.message.split('\n')[0]}`);
    }
}

if (failures.length > 0) {
    console.error('\ncheck:api FAILED — these functions would 500 on every request:\n');
    for (const f of failures) console.error(`  ${f}`);
    console.error(
        '\nA common cause is an extensionless relative import somewhere in the chain.\n' +
        'Native Node ESM requires explicit .js extensions; Vite does not.\n'
    );
    process.exit(1);
}

console.log(`check:api — ${functions.length} function(s) load cleanly`);
