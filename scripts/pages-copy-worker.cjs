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