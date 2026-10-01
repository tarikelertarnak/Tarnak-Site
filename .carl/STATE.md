# CARL STATE
status: ACTIVE
updated: 2026-10-01T20:35:00+03:00
protocol_path: C:\Users\TARIKELER\.config\opencode\commands\carl.md
host: OpenCode (opencode) — see HOST.md
branch: master   last_commit: 4dbe45e

=== CARL KERNEL (preserve verbatim in any summary/compaction) ===
1. I am CARL. Autonomous, phase-based, measured, non-stop. Talk to the user in Turkish.
2. First action after ANY reset/compaction/new session: read .carl/STATE.md, .carl/BACKLOG.md, then the full protocol file (path in STATE.md). Then perform the next concrete action immediately. Do not ask what happened.
3. Loop per phase: SELECT → BASELINE MEASURE → IMPLEMENT → RE-MEASURE → COMPARE → (fail→FIX) → COMMIT → LOG → NEXT.
4. No measurement = no closure. No fakes, ever. Every bug fix gets a regression test.
5. Ask the user nothing except what no tool/assumption can supply. Never end a turn with a plan; execute it.
6. Free-only infrastructure. Never enter payment info. Never write secrets to code/logs/commits.
7. Work on a dedicated git branch; commit every closed phase; checkpoint before destructive steps.
8. Update STATE.md at every phase boundary and whenever context feels heavy (>=60% or host warning).
9. Stop only on user stop signal (STOP / DUR / /carl stop) — see protocol Section 15.
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
phase: REKLAM (ADS) KALDIRMA — DONE   step: commit & deploy
bar: build yesil, tsc yesil, 303/303 test gecti, /reklam & /ads & /api/ads route listesinde yok
attempts_on_item: 1
files_in_flight: src/lib/site-navigation.ts, src/lib/site-navigation.test.ts, src/app/donate/page.tsx (+ silinen ads dosyalari)
running_processes: (none)

## Next 5 actions (concrete, executable)
1. Deploy: `npm run deploy` (opennextjs-cloudflare deploy) — kullanici "devam et" ile onay verdi
2. Canli dogrulama: /reklam 404, /donate'de WatchAdSection yok, /credits 200, sitemap 11 URL
3. Cloudflare DNS TXT: google-site-verification=n1-lFT1ZA4DDYRLClGr0uEaqcMafk8h07dVeolKpHlA
4. GSC sitemap durumunu tekrar kontrol et (periyodik okuma bekleniyor)
5. MASTER FAZ — SEO: route alias (/portfolyo, /cv, /projeler, /hakkimda) + metadata genisletme

## Role rotation
QA:0 BUG:1 UX:1 A11Y:1 PERF:1 SEC:1

## Key decisions / gotchas
- flags-data.ts (146KB) → public/flags/*.svg (218 dosya) — bundle'dan cikarildi
- LobeUI barrel → deep import (@lobehub/ui/base-ui)
- HeroUI @source taramasi kaldirildi (89KB CSS)
- getLocale → React cache() ile sarildi
- Rate limit: src/lib/rate-limit.ts (kayan pencere, IP bazli)
- ISR: cookies()/headers() dinamik opt-in kabul edildi (tek kullanicili portfolio)
- SearchDialog next/dynamic denendi, Next 16 client tip uyumsuzlugu → duz import korundu
- pnpm icin .exe yolu zorunlu (AGENTS.md §7)
- 2026-09-30: kullanici "reklam muhabbetini kaldir boş ver" → WatchAdSection, /reklam, /ads, /api/ads, components/ads/ SILINDI
- lib/ads.ts SILINMEDI: admin/overview.ts getStats() kullaniyor (reklam DB istatistikleri panel icin duruyor)
- sitemap'ten /reklam, /search, /login cikarildi (commit 4dbe45e) — noindex/Disallow olanlar listede olmamali
- Puck dynamic import olculdu: 3985 KB → 3988 KB, fayda yok → geri alindi (YAGNI)

## Open blockers
- (none)
