# TARMAS STATE
status: ACTIVE
updated: 2026-10-04T15:40:00+03:00
protocol_path: C:\Users\TARIKELER\.config\opencode\command\tarmas.md
host: OpenCode (opencode) — see HOST.md
branch: master   last_commit: 24537ff

=== TARMAS KERNEL (preserve verbatim in any summary/compaction) ===
1. I am TARMAS. Autonomous, phase-based, measured, non-stop. Talk to the user in Turkish.
2. First action after ANY reset/compaction/new session: read .tarmas/STATE.md, .tarmas/BACKLOG.md, then the full protocol file (path in STATE.md). Then perform the next concrete action immediately. Do not ask what happened.
3. Loop per phase: SELECT → BASELINE MEASURE → IMPLEMENT → RE-MEASURE → COMPARE → (fail→FIX) → COMMIT → LOG → NEXT.
4. No measurement = no closure. No fakes, ever. Every bug fix gets a regression test.
5. Ask the user nothing except what no tool/assumption can supply. Never end a turn with a plan; execute it.
6. Free-only infrastructure. Never enter payment info. Never write secrets to code/logs/commits.
7. Work on a dedicated git branch; commit every closed phase; checkpoint before destructive steps.
8. Update STATE.md at every phase boundary and whenever context feels heavy (>=60% or host warning).
9. Stop only on user stop signal (STOP / DUR / /TARMAS stop) — see protocol Section 15.
10. Never trust my memory of the project over the files: STATE.md, LOG.md, BACKLOG.md, PROJECT_MAP.md are the truth.
=== END KERNEL ===

## Commands (exact)
- build: `pnpm build` (Next.js + OpenNext) — pnpm.exe kullan (pnpm.ps1 YASAK)
- typecheck: `pnpm exec tsc --noEmit`
- test: `pnpm exec vitest run src/lib/phone.test.ts` (23/23)
- lint: `pnpm exec next lint`
- dev: `node node_modules/next/dist/bin/next dev --turbopack -p 3000`
- deploy: WSL rsync → /root/tarnak-build → pnpm opennext:build → wrangler pages deploy (ASLA otomatik)

## Current
phase: TARMAS / SEO + STATIK KAPANIS    step: verified (deploy d71b6d48, 7/7 prime, 9/9 404)
deployment: d71b6d48 (https://tarikelertarnak.pages.dev)   free_plan: Workers 10ms CPU
branch: master   last_commit: ac753d0 (yerel degisiklikler commit edilecek)
running_processes: (none)

## KAPANANLAR (2026-10-04)
- **1102 kapatildi**: 7 public sayfa + sitemap.xml + feed.xml static ASSET. Prime 7/7 ilk denemede
  200, worker hic devreye girmiyor, 0 CPU.
- **Blog detay static**: `/blog/[slug]` `force-dynamic` -> `force-static` + `generateStaticParams`
  + `dynamicParams = false` (neden: `getLocale()` cookies() -> SSR -> 10 ms CPU asim).
- **Soft-404 sinifi KAPANDI**: (a) `/blog/<olmayan-slug>` 200 -> 404; (b) eslesmeyen asset
  (`/yok.png`, `/manifest.webmanifest`) 200 + ana sayfa -> 404. Koke `404.html` yaziliyor.
- **Sitemap lastModified**: blog icin `post.date` (dosya mtime degil).
- **Isimlendirme**: `.carl` -> `.tarmas`, `/carl` -> `/tarmas`.

## OLCUM (deploy 4a5cbf93)
- tsc 0 hata · vitest 303/303 · build OK
- prime 7/7 ilk denemede 200 (`/`, `/projects/`, `/blog/`, `/about/`, `/credits/`, `/donate/`, `/github/`)
- 11 public rota + endpoint 200 · 9/9 404 sinifi dogru · slash'siz istek 308 -> slash'li adres
- `/admin` noindex,nofollow · sitemap 7 loc + 7 lastmod · robots 200 · feed 200
- `lang="tr"` · canonical `https://tarikelertarnak.pages.dev/` · JSON-LD Person + WebSite
- Diller tablosu · Kodun Ötesinde · CV picker · blog bos durum canlida
- **Light tema kontrast FIX**: `--color-foreground-500` sabit `#a1a1aa` idi -> light temada
  176 kullanim **2.56:1 (AA FAIL)**. `var(--tfg-600)` -> light 10.44:1, dark 7.95:1 (degismedi).
  Canli CSS dogrulandi: `.text-foreground-500{color:var(--tfg-600)}`
- Regresyon testi: `src/lib/theme-contrast.test.ts` 5 test (negatif kontrol ile kırildigi kanitli)
- vitest **308/308** (303 + 5 yeni) · tsc 0

## KALAN
- Cok dilli CV belgeleri (17 locale) yok -> kullanici karari
- `posts=0` -> gercek blog yazisi yok
- Bing verification token + IndexNow key yok
- BrowserOS neo kapali (:9210 connection refused) -> hover/interaksiyon testi yapilamadi
- Google OAuth `GOCSPX-` siri rotate edilmeli

## Next actions
1. Kullanici karari: cok dilli CV (yeni PDF'ler mi, site ici route mu)
2. Gercek blog yazisi eklendikce `deploy-pages.sh` (yazi = yeni deploy)
3. BrowserOS neo acilinca hover/hash temizleme testi
## 2026-10-04 UX fazi sonrasi (deploy 691e0322)
- Production: https://tarikelertarnak.pages.dev — prime 8/8, `/contact/` statik asset
- Test: 312/312 (23 dosya) · tsc 0 · negatif kontrol dogrulandi
- Kapanan: UX-011 (capasiz gezinme, tek buton stili, iki satirlik marka, light gorunurluk)
- Kayit: `.tarmas/LOG.md` UX-011 blogu
