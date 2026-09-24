#!/usr/bin/env node
// Copy OpenNext output worker to Pages _worker.js + patch for workerd runtime.
const fs = require('fs');
const path = require('path');

const openNextDir = path.resolve(__dirname, '..', '.open-next');
const src = path.join(openNextDir, 'worker.js');
const dst = path.join(openNextDir, '_worker.js');

try {
  fs.copyFileSync(src, dst);
  console.log(`[pages-copy-worker] copied worker.js -> _worker.js (${fs.statSync(dst).size} bytes)`);
} catch (e) {
  console.error('[pages-copy-worker] copy failed:', e.message);
  process.exit(1);
}

// workerd isomorphic require rule: a runtime `require("X")` (dynamic require)
// only resolves when X is already present in the worker's module graph.
// On nodejs_compat_v2 every node builtin and the next-server runtime modules
// must be force-imported so dynamic requires resolve at runtime.
const handlerPath = path.join(openNextDir, 'server-functions', 'default', 'handler.mjs');
if (fs.existsSync(handlerPath)) {
  let code = fs.readFileSync(handlerPath, 'utf8');
  // workerd isomorphic require rule: a runtime `require("X")` only resolves when
  // X is ALREADY in the worker's module graph as a live (non-tree-shaken) import.
  // esbuild drops unused imports, so every import must be referenced from a
  // global array with its actual symbol (globalThis.__iso).
  const imported = [];
  let isoRefs = [];
  if (code.includes('globalThis.__nb')) {
    code = code.replace(/import \* as __nb_\w+ from "[^"]+";\n/g, '').replace(/globalThis\.__nb = \[[^\]]*\];\n/, '');
  }
  // 1) next-server runtime modules (CJS compiled bundles) — force into graph.
  // Only the turbo + base server runtimes are used; importing all 13 ~3.3MB
  // blows the 25MiB Pages bundle limit.
  const NEEDED = new Set(['app-page-turbo.runtime.prod.js', 'app-route-turbo.runtime.prod.js', 'pages-turbo.runtime.prod.js', 'pages-api-turbo.runtime.prod.js', 'server.runtime.prod.js']);
  const nextServerDir = path.join(openNextDir, 'server-functions', 'default', 'node_modules');
  const nextPkg = (() => {
    if (fs.existsSync(path.join(nextServerDir, 'next'))) return 'next';
    const pnpm = path.join(nextServerDir, '.pnpm');
    if (fs.existsSync(pnpm)) {
      const d = fs.readdirSync(pnpm).find((x) => x.startsWith('next@16.') || x.startsWith('next@'));
      if (d) return path.join('.pnpm', d, 'node_modules', 'next');
    }
    return null;
  })();
  if (nextPkg) {
    const compiled = path.join(nextServerDir, nextPkg, 'dist', 'compiled', 'next-server');
    if (fs.existsSync(compiled)) {
      for (const file of fs.readdirSync(compiled).filter((f) => f.endsWith('.runtime.prod.js') && NEEDED.has(f))) {
        imported.push(`import * as __ns_${file.replace(/[^a-zA-Z0-9]/g, '_')} from "${path.posix.join('next/dist/compiled/next-server', file)}";`);
      }
    }
    // opennext .external.js wrappers — also must be in the isomorphic module graph.
    const extCandidates = [
      'build/adapter/setup-node-env.external.js',
      'server/require-hook.js',
      'server/node-environment.js',
      'server/node-environment-extensions/console-file.js',
      'server/dev/browser-logs/file-logger.js',
    ];
    const nextReal = path.join(nextServerDir, nextPkg);
    for (const rel of extCandidates) {
      if (fs.existsSync(path.join(nextReal, 'dist', rel))) {
        imported.push(`import * as __ext_${rel.replace(/[^a-zA-Z0-9]/g, '_')} from "next/dist/${rel}";`);
      }
    }
  }
  // 2) node builtins
  for (const b of ['assert','async_hooks','buffer','child_process','constants','crypto','events','fs','http','http2','https','module','os','path','process','stream','string_decoder','timers','tty','url','util','vm','zlib']) {
    const sym = `__nb_${b.replace(/[^a-zA-Z0-9]/g, '_')}`;
    imported.push(`import * as ${sym} from "node:${b}";`);
    isoRefs.push(sym);
  }
  // tie every import to a live symbol so esbuild keeps the whole graph
  const nextServerSyms = [];
  for (const line of imported) {
    const m = line.match(/^import \* as (\w+) from/);
    if (m && m[1] && !isoRefs.includes(m[1])) nextServerSyms.push(m[1]);
  }
  const block = imported.join('\n') + `\nglobalThis.__iso = [${[...isoRefs, ...nextServerSyms].join(',')}] || 0;\nimport { createRequire as __crr } from "node:module";\nglobalThis.require = globalThis.require || __crr(import.meta.url);\n`;
  code = block + code.replace(/^import\s/m, '// isomorphic imports injected\nimport ');
  // 3) dev-only/optional requires (react-dom development builds, picocolors...):
  // mark webpackIgnore so the bundler leaves them unresolved; they are only
  // reachable when NODE_ENV !== 'production' or inside try/catch.
  for (const pat of [
    String.raw`require\((['"])\./cjs/react-dom-server[^'"]*development\.js(['"])\)`,
    String.raw`require\((['"])picocolors(['"])\)`,
  ]) {
    const re = new RegExp(pat, 'g');
    const before = code;
    code = code.replace(re, 'require(/* webpackIgnore: true */ $1$2)');
    if (code !== before) console.log(`[pages-copy-worker] webpackIgnore'd dev-only require (${pat})`);
  }
  // 4) bare builtin requires (require("module")) must become require("node:module")
  // to match the isomorphic imports above — workerd requires identical specifiers.
  // Note: "node:module" itself is NOT an isomorphic module in workerd, so
  // next's require-hook.js (needs module.prototype.require) is neutralized below.
  const BUILTIN_BARE = ['assert','async_hooks','buffer','child_process','constants','crypto','events','fs','http','http2','https','module','os','path','process','stream','string_decoder','timers','tty','url','util','vm','zlib'];
  for (const b of BUILTIN_BARE) {
    const before = code;
    code = code.replace(new RegExp(String.raw`require\((['"])${b}(['"])\)`, 'g'), `require($1node:${b}$2)`);
    if (code !== before) console.log(`[pages-copy-worker] bare require("${b}") -> node:${b}`);
  }
  // 5) neutralize next/dist/server/require-hook.js: it patches module.prototype
  // for webpack userland plugins — workerd has no CJS "module" builtin, so the
  // whole hook is inert (webpack userland plugins don't run in Pages either).
  // NOTE: this file is bundled AS A FILE, so textual patches on handler.mjs do
  // NOT reach it. Patch the physical file in the output tree instead.
  const outRoot = path.dirname(handlerPath); // .open-next/server-functions/default
  const requireHookCandidates = [];
  const walkPnpm = (base) => {
    try {
      for (const d of fs.readdirSync(base)) {
        if (d.startsWith('next@16')) {
          const p = path.join(base, d, 'node_modules', 'next', 'dist', 'server', 'require-hook.js');
          if (fs.existsSync(p)) requireHookCandidates.push(p);
          const p2 = path.join(base, d, 'node_modules', 'next', 'dist', 'esm', 'server', 'require-hook.js');
          if (fs.existsSync(p2)) requireHookCandidates.push(p2);
        }
      }
    } catch {}
  };
  walkPnpm(path.join(outRoot, 'node_modules', '.pnpm'));
  const rhDirect = path.join(outRoot, 'node_modules', 'next', 'dist', 'server', 'require-hook.js');
  if (fs.existsSync(rhDirect)) requireHookCandidates.push(rhDirect);
  for (const f of requireHookCandidates) {
    let src = fs.readFileSync(f, 'utf8');
    const orig = src;
    // mod is undefined under workerd (no CJS "module" builtin) → replace with a
    // inert dummy so every subsequent mod.* access is safe (originalRequire,
    // _resolveFilename assignments all become no-ops).
    src = src.replace(/const mod = require\(['"](?:node:)?module['"]\);/, 'const mod = { prototype: { require: null }, _resolveFilename: null };');
    if (src !== orig) {
      fs.writeFileSync(f, src);
      console.log(`[pages-copy-worker] neutralized require-hook: ${f}`);
    } else {
      console.log(`[pages-copy-worker] skip (pattern not found): ${f}`);
    }
  }
  fs.writeFileSync(handlerPath, code);
  console.log(`[pages-copy-worker] injected ${imported.length} isomorphic imports (nodejs_compat_v2 dynamic require fix)`);
} else {
  console.log('[pages-copy-worker] handler.mjs not found — nothing to patch');
}

// Pages' bundler resolves optional/dev-only requires (critters, otel, react-dom
// development builds) against the output node_modules. OpenNext only copies
// files actually bundled, so copy these here so the bundler can resolve them.
function ensureModule(destName, extra) {
  const dest = path.join(openNextDir, 'server-functions', 'default', 'node_modules', destName);
  if (fs.existsSync(dest)) return;
  const siteRoot = path.resolve(__dirname, '..');
  const srcs = [path.join(siteRoot, 'node_modules', destName), path.join(siteRoot, 'node_modules', 'next', 'node_modules', destName), path.join(siteRoot, 'node_modules', 'next', 'dist', 'compiled', destName)];
  // pnpm layout: .pnpm/<name>@<ver>/node_modules/<name>
  const pnpmDirs = [];
  try { pnpmDirs.push(...fs.readdirSync(path.join(siteRoot, 'node_modules', '.pnpm')).filter((d) => d.startsWith(destName + '@')).map((d) => path.join(siteRoot, 'node_modules', '.pnpm', d, 'node_modules', destName))); } catch {}
  for (const s of [...srcs, ...pnpmDirs]) {
    if (fs.existsSync(s)) {
      fs.cpSync(s, dest, { recursive: true, force: true });
      console.log(`[pages-copy-worker] resolved ${destName} -> copied from ${path.relative(siteRoot, s)}`);
      return;
    }
  }
  console.log(`[pages-copy-worker] WARN: ${destName} not found to copy (bundler may fail)`);
}
ensureModule('critters');
ensureModule('@opentelemetry/api');
ensureModule('picocolors');
// react-dom dev-only cjs builds (literals only reachable when NODE_ENV != production)
{
  const dest = path.join(openNextDir, 'server-functions', 'default', 'node_modules', 'react-dom', 'cjs');
  const siteRoot = path.resolve(__dirname, '..');
  const srcCjs = path.join(siteRoot, 'node_modules', 'react-dom', 'cjs');
  for (const file of ['react-dom-server.browser.development.js', 'react-dom-server-legacy.browser.development.js', 'react-dom-server.browser.production.js', 'react-dom-server-legacy.browser.production.js', 'react-dom-server.node.development.js', 'react-dom-server.node.production.js', 'react-dom-server.edge.development.js', 'react-dom-server.edge.production.js']) {
    const full = path.join(srcCjs, file);
    if (fs.existsSync(full) && !fs.existsSync(path.join(dest, file))) {
      fs.mkdirSync(dest, { recursive: true });
      fs.copyFileSync(full, path.join(dest, file));
      console.log(`[pages-copy-worker] copied react-dom/cjs/${file}`);
    }
  }
}