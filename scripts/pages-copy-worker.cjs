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
  const imported = [];
  if (code.includes('globalThis.__nb')) {
    code = code.replace(/import \* as __nb_\w+ from "[^"]+";\n/g, '').replace(/globalThis\.__nb = \[[^\]]*\];\n/, '');
  }
  // 1) next-server runtime modules (CJS compiled bundles) — force into graph
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
      for (const file of fs.readdirSync(compiled).filter((f) => f.endsWith('.runtime.prod.js'))) {
        imported.push(`import * as __ns_${file.replace(/[^a-zA-Z0-9]/g, '_')} from "${path.posix.join('next/dist/compiled/next-server', file)}";`);
      }
    }
  }
  // 2) node builtins
  for (const b of ['assert','async_hooks','buffer','child_process','constants','crypto','events','fs','http','http2','https','module','os','path','process','stream','string_decoder','timers','tty','url','util','vm','zlib']) {
    imported.push(`import * as __nb_${b.replace(/[^a-zA-Z0-9]/g, '_')} from "node:${b}";`);
  }
  const block = imported.join('\n') + `\nglobalThis.__nb = [${imported.map(() => '1').join(',')}];\n`;
  code = block + code.replace(/^import\s/m, '// isomorphic imports injected\nimport ');
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
  for (const s of srcs) {
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
// react-dom dev-only cjs builds (literals only reachable when NODE_ENV != production)
{
  const dest = path.join(openNextDir, 'server-functions', 'default', 'node_modules', 'react-dom', 'cjs');
  const siteRoot = path.resolve(__dirname, '..');
  const srcCjs = path.join(siteRoot, 'node_modules', 'react-dom', 'cjs');
  for (const file of ['react-dom-server.browser.development.js', 'react-dom-server-legacy.browser.development.js', 'react-dom-server.browser.production.js', 'react-dom-server-legacy.browser.production.js', 'react-dom-server.node.development.js', 'react-dom-server.node.production.js']) {
    const full = path.join(srcCjs, file);
    if (fs.existsSync(full) && !fs.existsSync(path.join(dest, file))) {
      fs.mkdirSync(dest, { recursive: true });
      fs.copyFileSync(full, path.join(dest, file));
      console.log(`[pages-copy-worker] copied react-dom/cjs/${file}`);
    }
  }
}