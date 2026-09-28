# CARL STATE
status: ACTIVE
updated: 2026-09-28T00:50:00Z
protocol_path: C:\Users\TARIKELER\.config\opencode\command\carl.md
host: OpenCode (opencode) — see HOST.md
branch: main   last_commit: (pending)

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
- build: `pnpm build` (Next.js + OpenNext)
- typecheck: `pnpm exec tsc --noEmit`
- test: `pnpm exec vitest run src/lib/phone.test.ts`
- lint: `pnpm exec next lint`
- dev: `node node_modules/next/dist/bin/next dev --turbopack -p 3000`
- deploy: WSL rsync → /root/tarnak-build → pnpm opennext:build → wrangler pages deploy

## Current
phase: MASTER FAZ — ACCESSIBILITY — PART 6   step: verify
bar: tsc temiz, 23/23 test, 5 a11y sorunu duzeltildi
attempts_on_item: 0
files_in_flight: (none)
running_processes: (none - dev server kapandi)

## Next 5 actions (concrete, executable)
1. MASTER FAZ — PERFORMANCE — PART 3: bundle ölçümü, LCP, Lighthouse
2. MASTER FAZ — SECURITY — PART 2: dependency audit, secrets scan, input validation
3. Deploy: tüm düzeltmeleri canlıya al
4. MASTER FAZ — BUG — PART 12: yeni bug avci master faz
5. MASTER FAZ — UX PSİKOLOJİSİ — PART 5: derinlemesine UX analizi
## Role rotation
QA:0 BUG:1 UX:0 A11Y:0 PERF:1 SEC:1

## Key decisions / gotchas
- flags-data.ts (146KB) → public/flags/*.svg (218 dosya) — bundle'dan çıkarıldı
- LobeUI barrel → deep import (@lobehub/ui/base-ui)
- HeroUI @source taraması kaldırıldı (89KB CSS)
- getLocale → React cache() ile sarıldı
- Rate limit: src/lib/rate-limit.ts (kayan pencere, IP bazlı)
- Güvenlik: github.ts path traversal, puck store sessiz hata, login brute-force

## Open blockers
- (none)
