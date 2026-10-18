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

### Supabase

Sunucu ve site için `.env.local` içine `NEXT_PUBLIC_SUPABASE_URL` ve
`NEXT_PUBLIC_SUPABASE_ANON_KEY`; sunucu tarafı yönetim işlemleri için
`SUPABASE_SERVICE_ROLE_KEY` eklenir. Service-role anahtarını `NEXT_PUBLIC_`
ile adlandırmayın. Eski `SUPABASE_SERVICE_ROLE` adı geçici uyumluluk için
okunur; yeni kurulumlarda kullanılmamalıdır.

Şemalar şu an hem `supabase/*.sql`, hem `supabase/migrations/`, hem de
`scripts/schema-*.sql` altında tutuluyor. Bu repoda Supabase CLI veya yerel
Postgres kurulu değildir; SQL dosyaları dashboard SQL Editor'da uygulanır.
`supabase/migrations/` dosyaları sıra numarasına göre çalıştırılır. Yeni
kurulumda önce `supabase/site-content.sql`, sonra `supabase/migrations/`
migration'ları ve ihtiyaç duyulan diğer şema dosyaları uygulanır. Başlangıç
içeriği Hakkımda metni içermez; Hakkımda sayfası admin panelinden doldurulur.

Supabase CLI ve yerel proje hazır olduğunda kullanılacak doğrulama/typegen
komutları:

```sh
supabase db lint --local
supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

Canlı projede type üretimi için `--local` yerine
`--project-id <project-ref>` kullanılabilir. Type generation ve canlı DB lint
bu çalışma oturumunda çalıştırılmadı.

## Yapı

- `src/app/` — rotalar: `/` (vitrin), `/projects`, `/blog`, `/chat`, `/reklam`, `/github`, `/search`, `/credits`, `/donate`, `/admin` (yalnızca ADMIN_SECRET)
- `src/components/` — UI + bölüm bileşenleri
- `src/lib/` — iş mantığı: supabase, blog, chat, ads, i18n, github, puck, validations
- `data/` — build snapshot'ları ve Puck içerikleri; gerçek iletişim/sohbet kayıtları Supabase'tedir
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
