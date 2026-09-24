# TARIK ELER · TARNAK — Portfolio

Kişisel portfolio / blog / proje / CV sitesi. Next.js 16 (App Router) + React + Supabase (auth/veri) + Cloudflare Pages üzerinde.

**Canlı:** https://tarikelertarnak.pages.dev/

## Stack
- **Framework:** Next.js 16 (App Router, Turbopack), TypeScript
- **Stil:** Tailwind CSS 4, shadcn/ui, antd (admin), emotion
- **Veri/Auth:** Supabase (PostgREST + SSR auth), Arcjet (bot koruması)
- **İçerik:** Markdown blog + Puck (görsel sayfa editörü) + Supabase admin paneli
- **Deploy:** OpenNext (`opennextjs-cloudflare`) + Cloudflare Pages (direct upload)

## Kurulum
```sh
pnpm install           # postinstall: lightningcss patch uygular
cp .env.example .env.local   # gerçek değerleri doldur
pnpm dev               # local geliştirme (Turbopack)
pnpm test              # vitest
pnpm typecheck         # tsc --noEmit
```

## Yapı
- `src/app/` — rotalar: `/` (vitrin), `/projects`, `/blog`, `/chat`, `/reklam`, `/github`, `/search`, `/credits`, `/donate`, `/admin` (yalnızca ADMIN_SECRET)
- `src/components/` — UI + bölüm bileşenleri
- `src/lib/` — iş mantığı: supabase, blog, chat, ads, i18n, github, puck, validations
- `data/` — blog yazıları, chat mesajları, puck sayfaları, stars (supabase seed)
- `scripts/` — build/deploy yardımcıları (fetch-github-data, patch-lightningcss, pages-copy-worker)

## Deploy (Cloudflare Pages, direct upload)
Build **Windows'ta yapılamaz** (sharp win32 `.node` loader sorunu) — WSL Linux üzerinde kurulmuştur:
```sh
# WSL: ~/tarnak-build (projenin rsync kopyası)
pnpm install --frozen-lockfile
pnpm opennext:build
GITHUB_TOKEN= node scripts/pages-copy-worker.cjs   # worker yamaları + _routes.json + flatten
CI=true npx wrangler@latest pages deploy .open-next --project-name tarikelertarnak --branch master
```
Notlar:
- Git entegrasyonu (Workers Builds) **devre dışı** — yalnızca direct upload kullanılır, boş deploy/fail check üretilmez.
- `_routes.json` Pages advanced mode için zorunludur (statik dosyalar worker'a düşmesin).
- SEO: `robots.ts` + `sitemap.ts` + JSON-LD (`src/app/layout.tsx`); canonical her zaman `https://tarikelertarnak.pages.dev` (deploy-specific `CF_PAGES_URL` hash'leri asla kullanılmaz).

## Lisans
Tüm hakları saklıdır © Tarık Eler (Tarnak).