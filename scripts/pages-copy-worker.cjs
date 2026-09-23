// Cloudflare Pages requires the OpenNext worker at the OUTPUT ROOT as `_worker.js`.
// opennextjs-cloudflare build emits `.open-next/worker.js` only, so Pages deploys
// it as static assets-only -> every route 404s. Copy worker.js -> _worker.js.
const fs = require('fs');
const path = require('path');

const openNextDir = path.join(__dirname, '..', '.open-next');
const src = path.join(openNextDir, 'worker.js');
const dst = path.join(openNextDir, '_worker.js');

if (!fs.existsSync(src)) {
  console.error(`[pages-copy-worker] MISSING ${src} — opennext:build did not run?`);
  process.exit(0);
}
try {
  fs.copyFileSync(src, dst);
  console.log(`[pages-copy-worker] copied worker.js -> _worker.js (${fs.statSync(dst).size} bytes)`);
} catch (e) {
  console.error('[pages-copy-worker] copy failed:', e.message);
  process.exit(1);
}

// Patch handler.mjs: prefix-less node builtin requires (require("fs")) fail in
// Pages' bundler with nodejs_compat v1. Rewrite to node: prefix so esbuild
// treats them as external builtins.
const BUILTINS = ['assert','async_hooks','buffer','child_process','cluster','console','constants','crypto','dgram','diagnostics_channel','dns','domain','events','fs','http','http2','https','inspector','module','net','os','path','perf_hooks','process','punycode','querystring','readline','repl','stream','string_decoder','sys','timers','tls','trace_events','tty','url','util','v8','vm','wasi','worker_threads','zlib'];
const handlerPath = path.join(openNextDir, 'server-functions', 'default', 'handler.mjs');
if (fs.existsSync(handlerPath)) {
  let code = fs.readFileSync(handlerPath, 'utf8');
  let patched = 0;
  for (const b of BUILTINS) {
    const re = new RegExp(`require\\((['"])(${b})(['"])\\)`, 'g');
    const before = code;
    code = code.replace(re, `require($1node:${b}$3)`);
    if (code !== before) patched++;
  }
  fs.writeFileSync(handlerPath, code);
  console.log(`[pages-copy-worker] patched ${patched} node builtin requires with node: prefix in handler.mjs`);
} else {
  console.log('[pages-copy-worker] handler.mjs not found — nothing to patch');
}