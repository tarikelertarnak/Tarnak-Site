# TARMAS PLAN — serbest otonom (2026-10-10)

## Bağlam

- site/ Next.js 16.4.0 / React 19.1 / TS 5.9 strict / pnpm — branch `faz-1-guvenlik`.
- Canlı: tarikelertarnak.pages.dev (build db76e23c). Yerel `pnpm build` kırık
  (WSL lightningcss native binary; `public/github-data.json` her build'de regen).
- Geçen tur: UX-013 kartvizit (582ef38) + doküman logları (8986337, 536a2ab).

## Fırsat envanteri

| #   | Kat.     | Etki×Efor | Madde                                                                                                           | Kanıt                                         |
| --- | -------- | --------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | Güv      | H×L       | Backlogdaki SEC-001..006 çoğu kodda yapılmış. Backlog'u güncelle, `rate-limit-kv.ts` kırık put-yorumunu düzelt. | kod kontrolü + negatif kontrol test (✓ 13/13) |
| 2   | Perf     | H×L       | `getCvs`/`getContent` her istekte Supabase'ye gidiyor (PERF-005). Module-level cache TTL yok mu?                | grep cacheTTL                                 |
| 3   | Test     | M×L       | `src/app/api/github/route.test.ts` ertsi hatasız mı? (stderr 500/trace)                                         | grep                                          |
| 4   | Güv      | H×M       | `/api/contact` honeypot/turnstile yok mu? (AGENTS §5: Form_BOT_PROTECTION var mı?)                              | grep                                          |
| 5   | UI       | M×L       | `lint:strict` 687 hata → `--max-warnings 0` sadece changed-file. Full cleanup var mı?                           | eslint                                        |
| 6   | Frontend | L×L       | `public/` 247 dosya — asla silme kuralı (✓, gitignore yok)                                                      | n/a                                           |
| 7   | Backend  | M×M       | 1102/1103/1104 — yeni fırsat: `pages-copy-worker.cjs` / wrangler config güncel mi?                              | grep                                          |
| 8   | Rakip    | L×L       | last30days: kimler "QR-only vCard" trendi? (harmless, fırsat)                                                   | agent-reach                                   |

## Seçim (ilk açık madde)

[1] isaretli backlog güncelle + put-yorum düzeltmesi (hâlâ yapımıyor — yorum sadece).
