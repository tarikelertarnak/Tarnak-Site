# CARL STATE
status: ACTIVE
updated: 2026-10-01T21:20:00+03:00
protocol_path: C:\Users\TARIKELER\.config\opencode\commands\carl.md
host: OpenCode (opencode) — see HOST.md
branch: master   last_commit: 590956b

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
phase: CANLI CPU LIMITI KRIZI — DONE (reklam fazi canliya alindi)   step: root cause confirmed
bar: 590956b production'a deploy edildi (7c78bb3f). /reklam /ads /api/ads = 404, /donate'de reklam yok, sitemap 11 URL — HEPSI DOGRU. Ancak worker route'lari aralikli 503 (Cloudflare 1102).
attempts_on_item: 2
files_in_flight: (none — calisma agaci temiz, 590956b commit'li)
running_processes: (none)

## CANLI DURUM KRITI (2026-10-01 21:20)
- Cloudflare 1102 = "Worker exceeded CPU time limit". Tail kaniti: outcome=exceededCpu, cpuTime=18ms.
- A/B olcum (interleaved, 20 istek): ESKI 6-gunlu deployment 200=3/503=7, YENI 200=2/503=8 → AYNI. Bu bir regresyon DEGIL, pre-existing.
- Statik dosyalar (/sitemap.xml, /robots.txt, /_next/static/*) = 200 DAIMA. Worker route'lari (/, /donate, /reklam) = 503 aralikli. _routes.json dogru calisiyor.
- Kok neden: handler.mjs 13MB, 23 node builtin + next-server runtime modulunu zorla import ediyor (pages-copy-worker.cjs). Cold start CPU 18ms > Free plan limiti (~10ms).
- Cloudflare status: "Workers build delays" olayi acik (2026-09-30'dan beri, monitoring) — hesap/plan seviyesi etkisi muhtemel.

## Next 5 actions (concrete, executable)
1. CPU azalt: pages-copy-worker.cjs'teki 23 node builtin import'unu daralt (child_process, tty, vm, http2, zlib gercekten gerekli mi — NEEDED seti gibi beyaz liste). Sonra yeniden olc.
2. Alternatif: Cloudflare Workers Paid planina gec (limit 30s CPU). Kullanici onayi + odeme gerekli — otomatik YAPILAMAZ.
3. GSC sitemap durumunu tekrar kontrol et (periyodik okuma bekleniyor)
4. Cloudflare DNS TXT: google-site-verification=n1-lFT1ZA4DDYRLClGr0uEaqcMafk8h07dVeolKpHlA
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
- 2026-10-01: deploy pipeline kesinlesmis akis — WSL rsync → /root/tarnak-build → pnpm opennext:build → node scripts/pages-copy-worker.cjs → wrangler pages deploy .open-next --project-name tarikelertarnak --branch master
- Pages production branch = MASTER. `--branch main` SADECE preview uretir (canliya hic dokunmaz). Bu yuzden ilk 3 deploy (6039c17a, 44b6808d, 504d0b83) preview idi.
- Preview URL apex'e 308 redirect yapar; apex = production. Test icin preview'e degil production'e bak.
- WSL PowerShell quote tuzagi: `grep -oE "a|b"` ic ice tirnaklar bozulur → WSL bash script dosyasi yaz, /mnt/c/... uzerinden calistir.
- Her WSL bash -c cagrisi AYRI distrosyon acir → /tmp dosyalari kaybolur. Kalici dosya kullan veya tek script icinde yap.
- wrangler pages deployment tail icin: `npx wrangler pages deployment tail <DEPLOYMENT_ID> --project-name tarikelertarnak --format json` — ID verilmezse hata verir.
- Cloudflare 1102 = CPU limit. Statik 200 + worker 503 = bundle/cold-start sorunu, _routes.json degil.

## Open blockers
- CANLI SITE KISITLI: worker route'lari aralikli 503 (Cloudflare CPU limit). Reklam kaldirma DOGRU ve canlida, ama sayfa yukleme aralikli basarisiz. Cozum: CPU azalt (build) veya plan yukselt (odeme — kullanici onayi lazim).
