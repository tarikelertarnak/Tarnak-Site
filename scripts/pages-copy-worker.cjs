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
  // workerd isomorphic require: dynamic require("node:fs") only works when the
  // module is already part of the worker's module graph. Force-reference every
  // node builtin as an import so runtime requires resolve.
  const importBlock = [
    `import * as __nb_fs from "node:fs";`,
    `import * as __nb_path from "node:path";`,
    `import * as __nb_os from "node:os";`,
    `import * as __nb_crypto from "node:crypto";`,
    `import * as __nb_url from "node:url";`,
    `import * as __nb_vm from "node:vm";`,
    `import * as __nb_stream from "node:stream";`,
    `import * as __nb_util from "node:util";`,
    `import * as __nb_module from "node:module";`,
    `import * as __nb_http from "node:http";`,
    `import * as __nb_https from "node:https";`,
    `import * as __nb_tty from "node:tty";`,
    `import * as __nb_async_hooks from "node:async_hooks";`,
    `import * as __nb_buffer from "node:buffer";`,
    `import * as __nb_process from "node:process";`,
    `import * as __nb_events from "node:events";`,
    `import * as __nb_timers from "node:timers";`,
    `import * as __nb_assert from "node:assert";`,
    `import * as __nb_constants from "node:constants";`,
    `import * as __nb_child_process from "node:child_process";`,
    `import * as __nb_zlib from "node:zlib";`,
    `import * as __nb_string_decoder from "node:string_decoder";`,
    `globalThis.__nb = [__nb_fs,__nb_path,__nb_os,__nb_crypto,__nb_url,__nb_vm,__nb_stream,__nb_util,__nb_module,__nb_http,__nb_https,__nb_tty,__nb_async_hooks,__nb_buffer,__nb_process,__nb_events,__nb_timers,__nb_assert,__nb_constants,__nb_child_process,__nb_zlib,__nb_string_decoder];`
  ].join('\n');
  if (!code.includes('globalThis.__nb')) {
    code = importBlock + '\n' + code;
    fs.writeFileSync(handlerPath, code);
    console.log(`[pages-copy-worker] injected isomorphic builtin imports (workerd dynamic require fix)`);
  }
} else {
  console.log('[pages-copy-worker] handler.mjs not found — nothing to patch');
}