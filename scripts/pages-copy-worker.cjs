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