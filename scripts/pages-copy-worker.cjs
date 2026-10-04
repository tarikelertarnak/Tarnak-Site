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
  // Idempotency: bu script build sonrasi her calistiginda ayni handler.mjs uzerinde
  // calisir. 2026-10-03'te ikinci calistirmada inject edilen blok baseline'i gormeyip
  // DUPLICATE import ekliyordu -> wrangler "The symbol __nb_stream has already been
  // declared" ile 28 hata verip deploy'i durduruyordu.
  // Karsi onlem: inject ettigimiz marker satiri zaten varsa handler.mjs'e DOKUNMA
  // (worker.js -> _worker.js kopyasi yukarida zaten yapildi).
  if (code.includes('globalThis.__iso = [')) {
    console.log('[pages-copy-worker] handler.mjs zaten inject edilmis — atlandi (idempotent)');
  } else {
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
  // ponytail: yalnizca handler.mjs icinde gercekten require() edilenleri cek.
  // 2026-10-01 olcumu: child_process=0, constants=0, string_decoder=0 kullanim;
  // geri kalanlar 1..61 arasi. Bos builtin import etmek cold start CPU'yu
  // (18ms, Free plan limiti ~10ms) artiriyordu — 1102 "exceededCpu" kok nedeni.
  const BUILTIN_USED = ['async_hooks','buffer','crypto','events','fs','http','http2','https','module','os','path','process','stream','timers','tty','url','util','vm','zlib'];
  for (const b of BUILTIN_USED) {
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
  const BUILTIN_BARE = BUILTIN_USED;
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
  }
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

// Flatten OpenNext assets/ into the output root — Pages serves static files from
// the deploy directory root ("/"), so /assets/_next/... URLs would 404 (Next.js
// emits absolute /_next/static/... links). Copy everything from assets/ up one
// level, skipping conflicts and the _worker.js marker.
{
  const assetsDir = path.join(openNextDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    let n = 0;
    for (const entry of fs.readdirSync(assetsDir)) {
      const from = path.join(assetsDir, entry);
      const to = path.join(openNextDir, entry);
      if (fs.existsSync(to)) continue; // don't clobber worker/server-functions
      fs.cpSync(from, to, { recursive: true });
      n++;
    }
    console.log(`[pages-copy-worker] flattened ${n} asset entries to output root (static URLs /... now correct)`);
  }
  // After flattening, the original assets/ tree is redundant (its content lives
  // at the root now). Remove it so the deploy doesn't create stray /assets/* URLs.
  // Content is already copied above; this is a post-copy cleanup, not data loss.
  if (fs.existsSync(assetsDir)) {
    fs.rmSync(assetsDir, { recursive: true, force: true });
    console.log('[pages-copy-worker] removed assets/ after flatten (content is at root)');
  }
}

// 2026-10-04: /sitemap.xml ve /feed.xml'i SAF STATIK ASSET'e cevir.
//
// Neden: bu iki route build'de prerender ediliyor (.open-next/cache/<id>/
// sitemap.xml.cache) ama Pages'in cikti kokunde DOSYA olarak bulunmuyorlar.
// Sayfa HTML'leri de .cache icinde duruyor ve worker onlari okuyup
// sunabiliyor; ancak bu iki route'un handler'i calisirken node:fs kullaniyor
// (sitemap.ts -> statSync, feed.xml -> getPosts() -> data/blog/posts.json).
// workerd'de runtime fs yok -> 500. Canli /sitemap.xml ve /feed.xml 500
// donuyordu; arama motorlarinin en cok isteyebilecegi iki dosya.
//
// Cozum: prerender sirasinda uretilen govdeyi .cache JSON'indan cikarip
// cikti kokune DOGRUDAN yaziyoruz, sonra _routes.json'da exclude ediyoruz.
// Boylece Pages'in static servisi sunuyor: worker hic devreye girmiyor,
// 10 ms CPU harcanmiyor, fs calismiyor, 500 olmuyor. robots.txt zaten boyle
// calisiyor.
//
// Onceki deneme (2026-10-03) '/*.xml' exclude edince 404 almisti; sebebi
// exclude'un Pages'e ESKI public/sitemap.xml'i vermesiydi. public/sitemap.xml
// artik yok ve kokteki dosya her build'de yeniden uretiliyor, sorun gecerli
// degil. Yine de wildcard yerine iki dosyayi ACIKCA isimlendiriyoruz.
{
  const cacheRoot = path.join(openNextDir, 'cache');
  const buildIds = fs.existsSync(cacheRoot)
    ? fs.readdirSync(cacheRoot).filter((d) => !d.startsWith('__') && fs.statSync(path.join(cacheRoot, d)).isDirectory())
    : [];
  for (const name of ['sitemap.xml', 'feed.xml']) {
    let written = false;
    for (const b of buildIds) {
      const c = path.join(cacheRoot, b, name + '.cache');
      if (!fs.existsSync(c)) continue;
      try {
        const j = JSON.parse(fs.readFileSync(c, 'utf8'));
        if (typeof j.body === 'string' && j.body.length) {
          fs.writeFileSync(path.join(openNextDir, name), j.body);
          console.log(`[pages-copy-worker] extracted ${name} (${j.body.length} bayt) -> static asset`);
          written = true;
          break;
        }
      } catch (e) {
        console.log(`[pages-copy-worker] WARN ${name} .cache okunamadi: ${e.message}`);
      }
    }
    if (!written) console.log(`[pages-copy-worker] WARN ${name} .cache yok — worker'a birakildi (500 riski)`);
  }
}

// 2026-10-04: PRERENDER EDILMIS SAYFALARI da statik asset'e cevir.
//
// Neden: Next build her public sayfayi prerender ediyor (.open-next/cache/<id>/
// index.cache = 372 KB, about.cache, projects.cache ...). Ama bu .cache
// dosyalari Pages'in cikti kokunde DILE duyulmuyor; sayfa ancak worker'a
// dustugunde render ediliyor. Ana sayfanin SSR'i 258 KB HTML uretiyor ve
// Workers Free 10 ms CPU limitini asiyor -> canli / = 503 / timeout, KV'ye de
// yazilamiyor -> kalici olarak olu. /projects ve /about yalnizca daha onceden
// KV'ye yazilmis olduklari icin HIT donuyor.
//
// Cozum: sitemap/feed icin yaptigimizin aynisi. .cache JSON'unun govdesini
// <route>/index.html olarak cikti kokune yaziyoruz; Pages static servisi
// sunuyor, worker hic devreye girmiyor, 0 CPU, 503 yok.
//
// DIKKAT: exclude listesinde WILDCARD kullanmiyoruz. '/blog/*' gibi desenler
// /blog/<slug> detayini de statik'e dusururdu (404). Sadece tam sayfa
// yollari listeleniyor; dinamik alt rotalar worker'da kalir.
// Trade-off: client-side Link navigasyonu RSC istegini static HTML'den alir,
// Next bunu "MPA navigation" sayip tam sayfa yenilemesine duser. Yavas,
// ama kirik degil — 503'den cok iyi.
const routesExclude = [];
{
  // 2026-10-04: SOFT-404 YAN ETKISI — Pages'in asset-miss davranisi.
  //
  // Bulgu (canli olcum): `yok.png`, `yok.jpg`, `yok.woff2`, `manifest.webmanifest`
  // → HTTP 200 + 258 KB ANA SAYFA HTML'i. `yok.json`, `yok.css`, `yok.js` → 404.
  // Neden: Pages, exclude listesindeki bir ASSET yolunu static servisine verir.
  // Dosya yoksa Pages kokteki `index.html`'yi **200 ile** servis eder (SPA
  // fallback). Bizim exclude listemiz `/*.png`, `/*.jpg` gibi WILDCARD iceriyor,
  // yani "bu uzantili dosya yoksa ana sayfayi dondur" demis oluyoruz. Onceki
  // deployment'da (0d11fdbd, index.html static degilken) `/yok.png` 404 len=0
  // donuyordu → yan etkiyi biz getirdik.
  //
  // Cozum: Pages'in 404.html desteklemesi. Koke prerender edilmis not-found
  // sayfasini 404.html olarak yaziyoruz; Pages eslesmeyen asset icin
  // index.html yerine 404.html + HTTP 404 donuyor.
  const cacheRoot = path.join(openNextDir, 'cache');
  const buildIds = fs.existsSync(cacheRoot)
    ? fs.readdirSync(cacheRoot).filter((d) => !d.startsWith('__') && fs.statSync(path.join(cacheRoot, d)).isDirectory())
    : [];
  const PAGES = {
    '': 'index',
    '/about': 'about',
    '/blog': 'blog',
    '/contact': 'contact',
    '/projects': 'projects',
    '/credits': 'credits',
    '/donate': 'donate',
    '/github': 'github',
  };
  const statics = [];
  for (const [route, base] of Object.entries(PAGES)) {
    let done = false;
    for (const b of buildIds) {
      const c = path.join(cacheRoot, b, base + '.cache');
      if (!fs.existsSync(c)) continue;
      try {
        const j = JSON.parse(fs.readFileSync(c, 'utf8'));
        // Sayfa .cache'lerinde govde "body" degil "html" alaninda
        // ({type,meta,html,rsc,segmentData}); XML route'larinda "body".
        const body = typeof j.html === 'string' && j.html.length
          ? j.html
          : (typeof j.body === 'string' ? j.body : '');
        if (body.length > 1000) {
          const dir = route === '' ? openNextDir : path.join(openNextDir, route.slice(1));
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, 'index.html'), body);
          statics.push(route || '/');
          console.log(`[pages-copy-worker] extracted ${route || '/'} (${body.length} bayt) -> static asset`);
          done = true;
          break;
        }
        console.log(`[pages-copy-worker] WARN ${route || '/'} govde yok; anahtarlar: ${Object.keys(j).join(',')}`);
      } catch (e) {
        console.log(`[pages-copy-worker] WARN ${route || '/'} .cache okunamadi: ${e.message}`);
      }
    }
    if (!done) console.log(`[pages-copy-worker] WARN ${route || '/'}.cache yok — worker'a birakildi (503 riski)`);
  }
  // exclude'e eklenacak tam yollar. SADECE slash'li hal: slash'siz istek
  // worker'a dustugu icin Next'in skipTrailingSlashRedirect'i devreye girip
  // tek bir 308 ile slash'li adrese yolluyor. Slash'sizi de exclude edersek
  // Pages'in 308'i devreye giriyordu (prime 308'de basarisiz sayiyordu).
  for (const r of statics) {
    if (r === '/') routesExclude.push('/');
    else routesExclude.push(r + '/');
  }

  // 404.html: Pages, kokte 404.html varsa eslesmeyen yollar icin onu + HTTP
  // 404 donuyor (yoksa index.html + 200 = soft 404). Next'in prerender ettigi
  // not-found govdesini yaziyoruz; boylece hem /blog/yok-yazi hem /yok.png
  // dogru 404 doner.
  {
    let done = false;
    for (const b of buildIds) {
      const c = path.join(cacheRoot, b, '_not-found.cache');
      if (!fs.existsSync(c)) continue;
      try {
        const j = JSON.parse(fs.readFileSync(c, 'utf8'));
        const body = typeof j.html === 'string' && j.html.length
          ? j.html
          : (typeof j.body === 'string' ? j.body : '');
        if (body.length > 1000) {
          fs.writeFileSync(path.join(openNextDir, '404.html'), body);
          console.log(`[pages-copy-worker] extracted 404.html (${body.length} bayt) -> Pages 404 fallback (soft-404 fix)`);
          done = true;
          break;
        }
      } catch (e) {
        console.log(`[pages-copy-worker] WARN _not-found.cache okunamadi: ${e.message}`);
      }
    }
    if (!done) console.log('[pages-copy-worker] WARN _not-found.cache yok — 404.html uretilmedi (asset soft-404 kalir)');
  }
}

// _routes.json: without it, Pages advanced mode (_worker.js present) routes
// EVERY request into the worker, and static files (CSS/images) 404 — the worker
// never serves them. Excluding static paths returns those to Pages' asset
// service. Page routes (/reklam /blog /projects + dynamic) stay on the worker;
// only extension-based assets, /_next/*, /uploads/* and /cv/* are excluded.
{
  const routesPath = path.join(openNextDir, '_routes.json');
  const routes = {
    version: 1,
    include: ['/*'],
    exclude: [
      // pages-copy-worker ustunde prerender edilen sayfalar (/, /about, ...)
      // onceki blokta toplandi; onlar da static servise veriliyor.
      ...routesExclude,
      '/_next/*',
      '/*.png', '/*.jpg', '/*.jpeg', '/*.webp', '/*.avif', '/*.gif',
      '/*.svg', '/*.ico', '/*.woff', '/*.woff2', '/*.txt',
      // 2026-10-03: '/*.xml' KALDIRILDI. /sitemap.xml src/app/sitemap.ts'ten
      // (revalidate=3600, 7 rota) uretiliyor; exclude edince worker'a hic dusmuyor,
      // Pages eski public/sitemap.xml'i 7 gunluk cache ile (s-maxage=604800)
      // vermeye devam ediyordu -> /sitemap.xml?x=1 = 404. GSC "Getirilemedi".
      // XML artik worker'dan gelsin; Pages'in static servisine /sitemap.xml
      // kalmadi.
      // 2026-10-04: yukaridaki sorun gitti. public/sitemap.xml kaldirildi ve
      // bu script sitemap.xml + feed.xml'i cikti kokune prerender EDILMIS
      // govdeden yaziyor (yukaridaki blok). Bu yuzden iki dosya artik guvenle
      // exclude edilebilir: statik servis, 0 CPU, 500 yok. Wildcard
      // ('/*.xml') yerine dosya adi — var olmayan XML'leri kapsam dişi birakir.
      '/sitemap.xml',
      '/feed.xml',
      // 2026-10-02: /site.webmanifest 404 veriyordu — .webmanifest uzantisi exclude
      // listesinde yoktu, dosya worker'a dusuyordu. PWA manifest'i de Pages'in
      // static servisine verilmeli.
      '/*.webmanifest',
      // GSC HTML dogrulama dosyasi: static asset olarak .open-next/root'a
      // prerender edilmis (68 byte, dogru icerik) ama .html worker'a dustugu
      // icin route handler workerd'de 500 veriyordu (3/3 deneme). GSC sadece
      // 200 + icerik istiyor -> Pages'in static servisine birak.
      '/google*.html',
      '/cv/*',
      '/projects/*.png', '/projects/*.jpg', '/projects/*.jpeg',
      '/projects/*.webp', '/projects/*.gif', '/projects/*.svg',
      '/uploads/*',
      '/github-data.json',
    ],
  };
fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2) + '\n');
  console.log('[pages-copy-worker] wrote _routes.json (static assets -> Pages service, routes -> worker)');
}
