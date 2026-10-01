# PROJECT_MAP — tarikeler-portfolio (site/)

updated: 2026-09-28

## Amac
Kisisel portfolio + proje vitrin sitesi (TARIK ELER). Next.js 16 App Router, Cloudflare Pages'de canli: https://tarikelertarnak.pages.dev

## Tech stack
- Next.js 16.3.4 + React 19.1 + TypeScript 5.9
- antd 6.5 + Heroui 2.8 + LobeUI 5.24 + Puck 0.20 (visual editor)
- Supabase (auth + postgres: puck_pages, puck_versions, cvs, messages, profiles)
- OpenNext Cloudflare (@opennextjs/cloudflare 1.20) + wrangler 4.131
- Tailwind 4 + @antfu/eslint-config + vitest 2.1
- Arcjet 1.13 (edge guard), pg 8.23, zod 4, bcryptjs, sanitize-html, marked
- i18n: 9 locale (tr/en/de/es/fr/ja/pt/ru) — src/i18n/*.ts + src/lib/i18n*.ts

## Mimari
- `src/proxy.ts` — domain guard: sadece tarikelertarnak.pages.dev acik, diger host'lar 308
- `src/middleware.ts` — locale + auth redirect
- Puck editör → Supabase (src/lib/puck/store.ts, Supabase-first, dosya/bellek fallback)
- CV sistemi: supabase/cvs.sql → src/lib/cv.ts → about-section CvActions
- Rate limit: src/lib/rate-limit.ts (kayan pencere, IP bazli)
- GitHub entegrasyonu: src/lib/github.ts (path traversal korumali), /github/OWNER/REPO → 700ms sonra redirect
- Admin paneli: src/components/admin/ (puck sayfalari, kullanicilar, cvs kaynagi)

## Route'lar
- `/` hero + sections (hero/projects/blog/about/contact)
- `/login` `/sign` `/search` `/reklam` `/credits` `/about` `/projects` `/github`
- `/cv/tarikeler-cv.pdf` (66KB)
- `/sitemap.xml` `/robots.txt` (statik, public/)
- API: `/api/auth/{login,signup,logout,profile}` `/api/contact` `/api/stars`

## Komutlar
- build: `pnpm build` | typecheck: `pnpm exec tsc --noEmit` | test: `pnpm exec vitest run src/lib/phone.test.ts`
- lint: `pnpm exec next lint` | dev: `node node_modules/next/dist/bin/next dev --turbopack -p 3000`
- deploy: WSL rsync → /root/tarnak-build → pnpm opennext:build → wrangler pages deploy
- pnpm kurali: `.exe` yolu zorunlu (pnpm.ps1/pnpm.cmd calismaz)

## Ortam
- `.env.local` (gitignore'da) — SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_DB_PW (sadece scripts)
- `.env.example` repoda
- Canli: Cloudflare Pages (tarikelertarnak), build db76e23c

## Baseline (2026-09-28)
- tsc temiz, 23/23 test PASS
- 16 faz tamamlandi (SEC-001..006, PERF-001..007, SEO-001..004, BUG PART 11, UX PART 4, A11Y PART 6, CV sistemi)
- Son commit: 0d1f2dc (3 carl commit'i: phase-0 + sec + perf/seo/bug/ux/a11y/cv)
