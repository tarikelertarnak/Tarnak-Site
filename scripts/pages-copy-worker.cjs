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
  // Idempotency: isomorphic import'lar + ALS kurulumu birlikte inject edilir.
  // Marker alsMarker'dir (ALS satirinin sonunda), __iso DEGIL: eski enjeksyonlarda
  // __iso var ama ALS yoktu (1101 kokeni) — __iso kontrolu o dosyayi yanlislikla
  // "zaten inject" deyip ALS'i atliyordu. Taze build'de ikisi de yoktur.
  const alsMarker = '/*__TARNAK_ALS__*/';
  if (code.includes(alsMarker)) {
    console.log('[pages-copy-worker] handler.mjs zaten inject edilmis — atlandi (idempotent)');
  } else {
  // workerd isomorphic require rule: a runtime `require("X")` only resolves when
  // X is ALREADY in the worker's module graph as a live (non-tree-shaken) import.
  // esbuild drops unused imports, so every import must be referenced from a
  // global array with its actual symbol (globalThis.__iso).
  const imported = [];
  let isoRefs = [];
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
  // 7) AsyncLocalStorage ZORUNLU KURULUMU (2026-10-18, 1101 kök nedeni).
  //
  // Next 16 `app-page-turbo.runtime.prod.js` modül yüklenirken
  // `work-async-storage.external.js` → `async-local-storage.js`'i Çağırıyor ve
  // bu dosya `createAsyncLocalStorage()` → `maybeGlobalAsyncLocalStorage` (yani
  // `globalThis.AsyncLocalStorage`) boşsa FakeAsyncLocalStorage döndürüp
  // `.run()`/`.disable()`'te "Invariant: AsyncLocalStorage accessed in runtime
  // where it is not available" fırlatıyor. workerd'de bu kırılım worker'ın ilk
  // istekte ASILMASına (hang) ve 1101'e yol açıyor — TÜM worker rotaları
  // (/admin, /api/*, /github/*) ölüyor.
  //
  // NEDEN node-environment-baseline.js yetermiyor? O dosya
  // `if (typeof globalThis.AsyncLocalStorage !== 'function')` ile kuruyor,
  // ama handler.mjs'te `__ns_*` turbo runtime importları BLOKUN BAŞINDA
  // (satır 1-3), `__ext_server_node_environment_js` (baseline) ARKADA
  // (satır 6) — yani runtime modül eval edilmeden önce baseline çalışMIYOR.
  // Bu nedenle ALS'i BURADA, blok içinde, workerd'e gelmeden önce, elle kuruyoruz.
  // ALS KURULUMU IMPORT SIRASINA BAGLI (2026-10-19 olculdu): next/dist/server/
  // app-render/async-local-storage.js, modul GOVDESINDE yuklenirken
  // `const maybeGlobalAsyncLocalStorage = globalThis.AsyncLocalStorage` okuyor
  // (satir 53). O modul handler.mjs'in turbo-runtime import zincirinden geliyor ve
  // handler.mjs'in KENDI govdesinden ONCE evaluate ediliyor. Bu yuzden govdeye
  // yazilan bir atama (onceki yaklasim) HEP gec kaliyordu: /admin, /api/*,
  // /github/* "Invariant: AsyncLocalStorage accessed in runtime where it is not
  // available" ile 500. Cozum: ALS'i handler.mjs'in ILK importu olan ayri bir
  // preload modulunde kurmak. ESM importlari kaynak sirasiyla evaluate edilir ->
  // preload, turbo runtime'dan once calisir.
  const alsPreload = 'import \'./__tarnak_als_preload.mjs\';\n';
  fs.writeFileSync(
    path.join(path.dirname(handlerPath), '__tarnak_als_preload.mjs'),
    `${alsMarker}\nimport { AsyncLocalStorage as __ALS } from 'node:async_hooks';\nif (typeof globalThis.AsyncLocalStorage !== 'function') globalThis.AsyncLocalStorage = __ALS;\n`,
  );
  const block = `${alsMarker}\n${alsPreload}${imported.join('\n')}\nglobalThis.__iso = [${[...isoRefs, ...nextServerSyms].join(',')}] || 0;\nimport { createRequire as __crr } from "node:module";\nglobalThis.require = globalThis.require || __crr(import.meta.url);\n`;
  code = block + code.replace(/^import\s/m, '// isomorphic imports injected\nimport ');
  // 2b) OpenNext 1.20.6 x Next 16.4.0 UYUMSUZLUGU (2026-10-19, pristine build'de
  // de olculdu — bizim yamalarimizdan bagimsiz): OpenNext'in
  // `createComposableCacheHandlersRule` ast-grep yamasi `const cacheHandlers =
  // null;` satirini uretemiyor; bundle'da `cacheHandlers` kimligi modul
  // kapsamindaki `EnsureStaticLevel` enum'una baglaniyor
  // ({None:0,Shell:1,Prefetch:2,Navigation:3}). Sonuc: her route handler
  // (/api/*, /auth/*) `Object.entries(enum)` uzerinden
  // dynamicImport("file:/.next/None") yapiyor ->
  // 500 "No such module \"file:/.next/None\"".
  // OpenNext'in KASTETTIGI davranis `cacheHandlers = null` -> dongu HIC calismaz.
  // Ayni etkiyi dongu govdesini atlayarak veriyoruz. Isimden bagimsiz, dar
  // kapsamli: yalniz `formatDynamicImportPath` ile baslayan dongu govdesi.
  {
    const re = /if\(![\w$]+\)continue;(?=let\{formatDynamicImportPath:)/g;
    let n = 0;
    code = code.replace(re, () => {
      n++;
      return 'continue;';
    });
    console.log(`[pages-copy-worker] legacy cache-handler dongusu devre disi (${n} yer)`);
  }
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
  // 6) Next 16 `new NextNodeServer()` kurucusu HER istekte `getPreviewProps()`
  //    çağırıyor; OpenNext'in inlined loadManifest haritası `server/preview-props.json`
  //    için anahtar taşımıyor -> "Unexpected loadManifest(...preview-props.json) call!"
  //    -> worker ilk istekte patlıyor (canlıda 1101 = TÜM worker rotalarıölü:
  //    /admin, /api/*, /auth/*, /blog/[slug], /github/*).
  //    Build çıktısındaki GERÇEK preview anahtarlarını gömüyoruz. Boş nesne
  //    değil: `__prerender_bypass` çerezli istekte Next bu alanlarda uzunluk
  //    karşılaştırması yapıyor.
  {
    const propsFile = path.join(outRoot, '.next', 'server', 'preview-props.json');
    const marker = '/*TARNAK_PREVIEW_PROPS*/';
    if (fs.existsSync(propsFile) && !code.includes(marker)) {
      const raw = fs.readFileSync(propsFile, 'utf8').trim();
      JSON.parse(raw); // bozuksa build en başta patlasın
      const needle = 'prefetch-hints"))return{}}throw new Error(';
      const at = code.indexOf(needle);
      if (at === -1) {
        console.log('[pages-copy-worker] WARN: loadManifest fallback bulunamadi — preview-props yamasi atlandi');
      } else {
        code = code.slice(0, at)
          + `prefetch-hints"))return{}}if(path2.endsWith("preview-props.json"))return ${raw}${marker};throw new Error(`
          + code.slice(at + needle.length);
        console.log('[pages-copy-worker] preview-props manifest gomuldu (Next 16 getPreviewProps -> 1101 fix)');
      }
    } else if (!fs.existsSync(propsFile)) {
      console.log('[pages-copy-worker] WARN: preview-props.json yok — preview yamasi atlandi');
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
function ensureModule(destName) {
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

// ---------------------------------------------------------------------------
// BOYUT TRIMI — 25 MiB Pages Function limiti (hata 8000101).
//
// 2026-10-06 deploy "[code: 8000101] Function exceeded the uncompressed size
// limit of 25 MiB" ile dustu. .open-next olcumunde server-functions 50 MB,
// middleware 5.4 MB -> toplam ~55 MB. En buyuk TEK olu y:
// next/dist/server/capsize-font-metrics.json = 4.1 MB.
//
// Bu dosya next/font GOOGLE icin build aninda kullanilan font olcum
// verisidir. Projede `next/font` KULLANIMI YOK (grep sonucu: 0 import,
// public/ ve src/ altinda 0 woff2/ttf) -> dosya calisma aninda hic
// okunmuyor, sadece yuk. Next onu `require` ile cektiği icin Pages
// bundle'ina DAHIL ediliyor ve butceyi yiyor.
//
// Ayrica react-dom'un *.development.js dosyalari: NODE_ENV=production'da
// kullanilmaz, zaten `/* webpackIgnore: true */` ile isaretli (asagida).
// Bunlar da referanssiz olduklari icin silmek guvenli.
{
  const trimmed = [];
  const cut = (file, why) => {
    for (const base of ['server-functions', 'middleware']) {
      const walk = d => {
        let entries;
        try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
          const p = path.join(d, e.name);
          if (e.isDirectory()) walk(p);
          else if (e.name === file) {
            const sz = fs.statSync(p).size;
            fs.rmSync(p, { force: true });
            trimmed.push(`${(sz / 1048576).toFixed(1)} MB  ${path.relative(openNextDir, p).replace(/\\/g, '/')}  (${why})`);
          }
        }
      };
      walk(path.join(openNextDir, base));
    }
  };
  cut('capsize-font-metrics.json', 'next/font kullanilmiyor');
  const devWalk = d => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) devWalk(p);
      else if (e.name.endsWith('.development.js')) {
        const sz = fs.statSync(p).size;
        fs.rmSync(p, { force: true });
        trimmed.push(`${(sz / 1048576).toFixed(1)} MB  ${path.relative(openNextDir, p).replace(/\\/g, '/')}  (NODE_ENV=production)`);
      }
    }
  };
  for (const base of ['server-functions', 'middleware']) devWalk(path.join(openNextDir, base));

  // ---------------------------------------------------------------------
  // MIDDLEWARE KALDIRMA — 3.0 MB kazanc.
  //
  // Projede `middleware.ts` YOK (`src/middleware.ts` ve kok `middleware.ts`
  // dosyalari mevcut degil). OpenNext yine de `.open-next/middleware/`
  // altinda tam bir Next runtime bundle'i uretiyor ve `_worker.js` onu
  // import ediyor — 3.02 MB, hicbir sey yapmayan bir fonksiyon.
  //
  // OpenNext'in middleware kaynagi yokken yaptigi sey `request`'i oldugu
  // gibi geri dondurmek. `_worker.js`te o cagriyi yerinde bu degisimle
  // degistirip middleware klasorunu siliyoruz: ayni davranis, 3 MB yok.
  {
    const mwDir = path.join(openNextDir, 'middleware');
    const repoRoot = path.resolve(__dirname, '..');
    const srcHasMw = ['middleware.ts', 'middleware.tsx', 'middleware.js']
      .some(f => fs.existsSync(path.join(repoRoot, 'src', f)) || fs.existsSync(path.join(repoRoot, f)));
    if (!srcHasMw) {
      let sz = 0;
      const w = d => {
        let st; try { st = fs.statSync(d) } catch { return }
        if (st.isDirectory()) { for (const n of fs.readdirSync(d)) w(path.join(d, n)); return }
        sz += st.size;
      };
      // IDEMPOTENCY (2026-10-19, olculdu): `_worker.js` bu script'in BASINDA her
      // calistirmada `worker.js`'ten yeniden kopyalanir (import geri gelir) ama
      // `middleware/` ikinci kez YOKTUR. Onceki surum bu blogu
      // `fs.existsSync(mwDir)` ile kapattigi icin 2. calistirmada import
      // temizlenmiyor, `wrangler pages dev` "Could not resolve
      // ./middleware/handler.mjs" ile patliyordu. Karar artik mwDir'e degil,
      // "middleware tutulacak mi" sorusuna bagli.
      if (fs.existsSync(mwDir)) w(mwDir);
      const workerPath = path.join(openNextDir, '_worker.js');
      if (fs.existsSync(workerPath)) {
        const before = fs.readFileSync(workerPath, 'utf8');
        let code = before;
        code = code.replace(/^\s*\/\/\s*@ts-expect-error: Will be resolved by wrangler build\s*\nimport \{ handler as middlewareHandler \} from "\.\/middleware\/handler\.mjs";\s*\n/m, '');
        code = code.replace(/const reqOrResp = await middlewareHandler\(request, env, ctx\);/, 'const reqOrResp = request; // middleware yok (src/middleware.ts yok)');
        if (code === before) {
          console.log('[pages-copy-worker] UYARI: _worker.js middleware importu temizlenemedi (desen degisti?)');
        } else {
          fs.writeFileSync(workerPath, code);
        }
      }
      if (fs.existsSync(mwDir)) {
        fs.rmSync(mwDir, { recursive: true, force: true });
        trimmed.push(`${(sz / 1048576).toFixed(1)} MB  middleware/  (kaynak middleware.ts yok, no-op)`);
      }
    }
  }

  if (trimmed.length) {
    const total = trimmed.reduce((s, l) => s + parseFloat(l), 0);
    for (const l of trimmed) console.log(`[pages-copy-worker] trim  ${l}`);
    console.log(`[pages-copy-worker] trimmed ${trimmed.length} dosya, ${total.toFixed(1)} MB kazanc (25 MiB limiti icin)`);
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
    '/chat': 'chat',
    '/changelog': 'changelog',
    '/gizlilik': 'gizlilik',
    '/kvkk': 'kvkk',
    '/login': 'login',
    '/now': 'now',
    '/sign': 'sign',
    '/uses': 'uses',
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

// Route only real server-rendered paths into the Worker. Unknown paths must
// reach Pages' asset service so its 404.html is returned instead of invoking
// the Worker for arbitrary URLs.
{
  const routesPath = path.join(openNextDir, '_routes.json');
  const routes = {
    version: 1,
    include: ['/admin', '/admin/*', '/api/*', '/auth/*', '/blog/*', '/github/*'],
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
