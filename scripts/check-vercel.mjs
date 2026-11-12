/**
 * vercel.json route-pattern check.
 *
 * Vercel compiles every `source` in `headers`, `rewrites` and `redirects` with
 * path-to-regexp v6 BEFORE the build starts. A pattern it cannot compile fails
 * the whole deployment — and a failed deployment is silent: the previous build
 * simply keeps serving.
 *
 * Why this exists: `"/(?:CV|cv)\\.pdf"` shipped in a header rule. v6 rejects a
 * top-level group that starts with `?` ("Pattern cannot start with "?""), so
 * every deployment from 2026-09-16 failed and production stayed frozen on the
 * 2026-08-28 build for two months. Nothing local could see it: Vite never reads
 * vercel.json.
 *
 * Runs on `prebuild` with the same major version of path-to-regexp Vercel uses
 * (pinned in devDependencies), so a bad pattern fails `npm run build` locally
 * instead of failing the deploy.
 *
 * Usage: node scripts/check-vercel.mjs [path/to/vercel.json]
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pathToRegexp } from 'path-to-regexp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROUTE_KEYS = ['headers', 'rewrites', 'redirects'];

/**
 * @param {unknown} config Parsed vercel.json.
 * @returns {string[]} One message per invalid pattern; empty when all compile.
 */
export const findInvalidSources = (config) => {
    const failures = [];

    for (const key of ROUTE_KEYS) {
        const rules = config?.[key];
        if (rules === undefined) continue;
        if (!Array.isArray(rules)) {
            failures.push(`${key}: expected an array`);
            continue;
        }

        rules.forEach((rule, index) => {
            const source = rule?.source;
            if (typeof source !== 'string') {
                failures.push(`${key}[${index}]: missing a "source" string`);
                return;
            }
            try {
                pathToRegexp(source);
            } catch (error) {
                failures.push(`${key}[${index}] source ${JSON.stringify(source)}: ${error.message}`);
            }
        });
    }

    return failures;
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
    const file = resolve(process.argv[2] ?? resolve(ROOT, 'vercel.json'));

    let config;
    try {
        config = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
        console.error(`check:vercel FAILED — cannot read ${file}: ${error.message}`);
        process.exit(1);
    }

    const failures = findInvalidSources(config);
    if (failures.length > 0) {
        console.error('\ncheck:vercel FAILED — Vercel would reject this deployment:\n');
        for (const failure of failures) console.error(`  ${failure}`);
        console.error(
            '\nRoute sources use path-to-regexp v6 syntax. A top-level group may not\n' +
            'start with "?": write "/(CV|cv)\\\\.pdf", not "/(?:CV|cv)\\\\.pdf".\n'
        );
        process.exit(1);
    }

    const count = ROUTE_KEYS.reduce((n, key) => n + (config[key]?.length ?? 0), 0);
    console.log(`check:vercel — ${count} route pattern(s) compile cleanly`);
}
