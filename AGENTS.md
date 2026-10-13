# AGENTS.md — TARIK ELER TARNAK (site)

> Bu klasör (`site/`) kişisel portfolyo + blog + yönetim paneli uygulamasıdır; repo kökü burasıdır.
> Tüm değerler 2026-10-10'da koddan doğrulandı. Emin olunmayan yerlerde **BİLİNMİYOR** yazılıdır.

## 1. Stack (doğrulanmış sürümler)

- **Next.js 16.4.0** (App Router, Turbopack dev) · **React 19.1.0** · **TypeScript 5.9.3** (strict)
- **Tailwind CSS v4** (`@tailwindcss/postcss`) + CSS değişkeni tasarım jetonları (`tokens.css`, `globals.css`)
- **UI:** `@lobehub/ui` (Button tabanı), `antd` 6.5.3 (+`@ant-design/nextjs-registry`), `@heroui/react` 2.8.5 (Tailwind plugin: `src/hero.ts`), `@emotion/{css,react}`, `@iconify/react`, `motion` 12
- **Veri/Auth:** `@supabase/ssr` + `@supabase/supabase-js` 2.112 · `bcryptjs` · `zod` 4 · `sanitize-html` · `marked` · `react-easy-crop` · `libphonenumber-js`
- **Dağıtım:** `@opennextjs/cloudflare` 1.20.6 + `wrangler` 4.x → **Cloudflare Pages/Workers** (`nodejs_compat_v2`; Free plan = 10 ms CPU)
- **Test:** `vitest` 2.1.9 (jsdom) + `@testing-library/react` · **E2E:** `playwright` 1.64
- **Kalite:** `eslint` 9 + `@antfu/eslint-config` 5 (flat) · `prettier` 3.9.6 · `husky` + `lint-staged`
- **Paket yöneticisi:** pnpm (lockfile v9; `packageManager: pnpm@9.15.0`; CI pnpm 12.4.2)

## 2. Komutlar

- Dev: `pnpm dev` (`next dev --turbopack`)
- Build: `pnpm build` (`next build`) — **Windows'ta çalışmaz (sharp win32 loader) → WSL'de çalıştır**
- OpenNext build: `pnpm opennext:build` (`opennextjs-cloudflare build`)
- Typecheck: `pnpm typecheck` (`tsc --noEmit`) → **0 hata**
- Test: `pnpm test` (`vitest run`) → **680 test / 61 dosya geçti**
- Lint: `pnpm lint` = `eslint . || true` ⚠️ **Windows'ta kırık** (`|| true` cmd/pwsh'te tanınmaz) → `pnpm exec eslint .` kullan
- Lint (kapı): `pnpm lint:strict` (`eslint . --max-warnings 0`) → şu an **687 hata** (hepsi stil, 663 auto-fix)
- Deploy: `bash scripts/deploy-pages.sh` (WSL) — **ASLA otomatik, kullanıcı onayı şart**

**Deploy akışı (WSL):** rsync → `~/tarnak-build` → `pnpm install --frozen-lockfile` → `CI=true pnpm opennext:build` → `node scripts/pages-copy-worker.cjs` → `npx wrangler pages deploy .open-next --project-name tarikelertarnak --branch master` → tüm public rotalar 200 olana kadar PRIME (1102 önlemi). `pnpm.ps1`/`.cmd` çalışmaz; `pnpm.exe` tam yolunu kullan.

## 3. Klasör haritası

- `src/app/` — rotalar. Public: `/` `/projects` `/blog` `/blog/[slug]` `/about` `/credits` `/donate` `/contact` `/uses` `/now` `/changelog` `/gizlilik` `/kvkk` `/github/[owner]/[repo]`; uygulama: `/chat` `/login` `/sign` `/admin`; meta: `sitemap.ts` `robots.ts` `feed.xml` `opengraph-image`; `api/*` route handler'ları.
- `src/components/` — `ui/`, `admin/`, `sections/` (Hero/About/Projects/Blog/Contact), `chat/`, `projects/` + tekiller (`TopBar`, `Sidebar`, `Footer`, `Navigation`, `SearchDialog`, `MusicPlayer`, `Shortcuts`, `ScrollSpy`, `Providers`, `ThemeInitScript`…).
- `src/lib/` — `content.ts` (içerik+Supabase merge), `auth.ts`, `blog.ts`, `chat.ts`, `chat-db.ts` (sohbet DB katmanı), `i18n(-server).ts`, `phase6.ts` (ek bölümler şeması — `content.phase6` anahtarı korunur), `section-fields.ts` (admin alan tanımları), `permissions.ts`, `rate-limit(-kv).ts`, `kv-cache.ts`, `csp-nonce.ts`, `site-url.ts`, `breadcrumb.ts` (301 haritası), `vcard.ts`, `image-crop.ts`, `google-auth.ts`, `supabase/{client,server,session,middleware,admin}.ts`, `admin/{resources,data,overview,csv}.ts`.
- `src/proxy.ts` — **middleware (kritik):** host guard (sadece `tarikelertarnak.pages.dev`), 301 kalıcı yönlendirme, CSP nonce, bakım modu, koşullu Supabase session refresh.
- `src/hooks/`, `src/data/` (statik: hero-stars, tech-stack, tech-colors), `src/i18n/` (tr/en/de/es/fr/ja/pt/ru), `src/instrumentation.ts` (Sentry).
- `data/` — `content.json`, `admin.json`, `puck-pages.json`, `puck-versions.json`, `stars.json` (build'e gömülür).
- `supabase/` — `schema.sql`, `site-content.sql`, `cvs.sql`, `puck-storage.sql`.
- `scripts/`, `e2e/`, `public/` (**247 dosya — ASLA silme**), `docs/`, `.tarmas/` (TARMAS state), `.github/workflows/`.

## 4. Veri katmanı / depolama

- **İçerik:** `data/content.json` build'e gömülür (Workers'ta fs YOK); `getContent()` Supabase tablolarıyla merge eder (`site_content`, `projects`, `skills`, `stats`), 5 dk module-level TTL cache. `saveContent()` Supabase-first, disk fallback.
- **Cloudflare KV** `NEXT_INC_CACHE_KV` (id `ddcb…`): hem ISR incremental cache (`open-next.config.ts`, 1102 fix) hem dağıtık rate limit (`rate-limit-kv.ts`; pahalı uçlarda fail-closed).
- **R2: YOK** (bilinçli; Free plan için KV seçildi). **D1: BİLİNMİYOR/yok.**
- **GitHub:** `GITHUB_TOKEN` env; `prebuild` → `scripts/fetch-github-data.cjs` snapshot; `/api/github/*` proxy uçları.
- **Yüklenen dosyalar:** `/uploads/:path*` → `Content-Disposition: attachment` + `nosniff`.

## 5. Admin auth

- İki yol: **(1)** `/login` → `admin_session` cookie (HMAC-SHA256, `ADMIN_SECRET`, bcrypt `admin.json` parolası, 7 gün). **(2)** Supabase Auth (Google OAuth `/api/auth/google` + e-posta kayıt `/sign`) — `@supabase/ssr` cookie session; `profiles.role/roles[]/is_owner` + izin kataloğu `src/lib/permissions.ts`.
- `/admin` girişi `getSessionUser()` ile kilitli; `role !== 'admin'` → "Yetkisiz Erişim". `dev-role` cookie bypass'ı **kaldırıldı** — geri EKLEME.
- Proxy session refresh yalnızca `/api /admin /auth /chat /login /puck /sign` prefix'lerinde (CPU tasarrufu).

## 6. Ortam değişkenleri (yalnızca adlar — değer yazma)

`NEXT_PUBLIC_SITE_URL` · `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE` · `NEXT_PUBLIC_GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `GOOGLE_ADMIN_EMAIL` · `GITHUB_TOKEN` · `CLOUDFLARE_API_TOKEN` · `ADMIN_SECRET` · `NEXT_PUBLIC_TURNSTILE_SITE_KEY` · `TURNSTILE_SECRET_KEY` · `ARCJET_KEY` · `FORM_BOT_PROTECTION` · `DISCORD_WEBHOOK_URL` · `CONTACT_NOTIFY_EMAIL` · `SENTRY_DSN` · `SENTRY_AUTH_TOKEN` · `NEXT_PUBLIC_ADSENSE_CLIENT` · `CF_PAGES_URL` · `MAINTENANCE_MODE` · `MAINTENANCE_LANG` · `CSP_ENABLED` · `EXPORT_MODE`. Şablon: `.env.example`; `.env*` gitignore'da (`.env.example` hariç).

## 7. Tasarım jetonları

- `src/app/tokens.css`: `--radius-xs..full` (4→16px), `--space-1..16`, `--text-xs..3xl` (clamp), `--leading-*`, `--duration-fast|base|slow`, `--ease-out`.
- `src/app/globals.css` — `html[data-theme='light'|'dark']` blokları: `--tbg` (#fff / #0a0a0c) · `--tsurface-0..3` (katman hiyerarşisi) · `--tsurface-border` · `--tsplit-divider` · `--tfg-200..950` · `--tprimary` (**light #3b82f6 / dark #2563eb**) · `--tprimary-fg` (**light #000000 / dark #ffffff**) · `--tsecondary(-fg)`. Tailwind köprüsü: `--color-primary`, `--color-foreground-*` → `bg-primary`, `text-primary-fg`, `text-foreground-500`…
- **`--section-gap: 24px`** (globals.css ~371): başlık → butonlar → içerik dikey boşluğunun TEK kaynağı. Bölümler `<div className="h-[var(--section-gap)]" />` ve `SectionTitle tightGap` ile uygular; elle `mt-*`/`pb-*` yazma.
- HeroUI renkleri `src/hero.ts`. Seçim rengi, ince scrollbar, `:focus-visible` halkası (2px `--tprimary`) hep jetondan.

## 8. Buton stili (TEK kural)

- `src/components/ui/button.tsx` masterClass — `solid + primary`: `!bg-primary !text-primary-fg !opacity-100 hover:!bg-primary/90 dark:!bg-primary/80 dark:hover:!bg-primary/70`.
- **Mavi zemin; metin/ikon açık temada SİYAH (`--tprimary-fg` #000), koyu temada BEYAZ (#fff).** Yükseklik tek sabit **40 px (`!h-10`)**; `size` yalnızca font/padding değiştirir. İkon-only `!h-10 !w-10`.
- SplitButton/hero butonları aynı dil: `src/components/ui/hero-button-style.ts` (mavi zemin, `border-primary-fg` çerçeve, 13 px/fw500, 40 px).

## 9. Tema mantığı

- `html` üzerinde `class="dark|light"` + `data-theme`; `ThemeInitScript` parse anında `localStorage`'dan okur (FOUC yok); SSR ilk boyama `force-static` layout'ta `defaultTheme` (auto/system → dark). `<html>`/`<body>` `suppressHydrationWarning` — kaldırma, hydration uyarısı döner.
- CSS değişkenleri `html[data-theme=…]` seçicisiyle (0,1,1 > `:root`) tanımlı — tema değerlerini `:root`'a yazarsan KAYBEDER.
- Dil: `site-locale` cookie + `Accept-Language` (`src/lib/i18n.ts`); yol bazlı dil routing'i YOK.

## 10. Yeniden kullanılabilir bileşen & hook'lar

- `ui/`: `Button`, `Card`, `Modal`, `Drawer`, `Input`, `Textarea`, `Link`, `Section`/`SectionTitle`, `Skeleton`, `SplitButton`, `searchable-combobox`, `phone-input`, `country-select`, `command` (cmdk), `star-rating`, `bento-box`, `load-more-button`, `cv-picker`, `cn`.
- Global: `TopBar`, `Sidebar`, `Navigation`, `Footer`, `SearchDialog` (⌘/Ctrl+K), `MusicPlayer`, `ScrollToTop`, `SkipLink`, `Shortcuts` (Ctrl+K/B//), `ShortcutHelp` (`?`), `ScrollSpy`, `AnnouncementBanner`, `ThemedBackground`, `ReadingProgress`.
- `admin/`: `AdminPanel` (5 sekme: Genel Bakış / Profil & Hakkımda / İçerik & Veri / Site Ayarları / Mesajlar & Kullanıcılar; alt gruplar `SubSection`), `ScrollableTabs` + `useScrollState` (oklar uçlarda, nokta göstergesi YOK — `TabScrollDots` kaldırıldı), `TabLabel`, `DataManager` (kaynak CRUD+CSV), `ChatPanel`, `SectionsEditor` (eski adı: `Faz6Editor`), `OverviewPanel`, `UsersPanel`, `ProfilePhotoUploader`.
- Hook'lar: `use-contact-form`, `use-scroll-state`, `use-grid-cols`, `use-row-pagination`, `use-previous-list-path`.

## 11. Sert kurallar

1. **`public/` dizinini asla silme** (3 kez silindi, `git checkout -- public/` ile kurtarıldı). Yıkıcı git komutu yasak.
2. **İçerik uydurma YOK** — blog/ek bölümler/YouTube boşken bölüm render edilmez veya "TODO" gösterilir.
3. **Glow ve imleç-arka plan (cursor bg) tepkisi YOK** — tasarım dili: düz koyu/açık zemin, mavi vurgu, yuvarlak köşe; hover sadece `bg-primary/90`.
4. **Özellikleri koru** — refactor'da mevcut davranışı bozma; her bug fix'e regresyon testi ekle, negatif kontrolle kanıtla.
5. **Push/deploy otomatik DEĞİL** — commit yerel kalır; deploy kullanıcı onayı ister.
6. **Gizli bilgi yazma** — anahtar/şifre koda, log'a, commit'e girmez; `.env*` gitignore.
7. Windows'ta `next build`/`pnpm lint` çalışmaz (sharp loader / `|| true`) → WSL + `pnpm exec eslint .`.

## 12. Bilinen sorunlar

- **Google OAuth client secret git geçmişinde sızmış** (`0d1f2dc`, `49da9b0`; public repo, `GOCSPX-`) → **rotate edilmeli** (`docs/secret-sizinti.md`).
- **Full-repo lint kırmızı:** 687 hata / 8 uyarı, çoğu `style/*` (arrow-parens 241, if-newline 94…), 663 auto-fix. CI yalnızca **değişen dosyaları** `--max-warnings 0` ile kapılar; tam tarama rapor-only.
- **Windows'ta `pnpm lint` exit 1** — `eslint . || true` bash söz dizimi cmd/pwsh'te kırık.
- `gitleaks` binary kurulu DEĞİL (`.gitleaks.toml` var; CI'da çalışır).
- `pnpm audit --prod`: 1 low + 1 moderate — `@lobehub/ui` üzerinden (`colord`, `katex`); çalışma yolunda değil, kaldırılamaz.
- **Supabase `site_content` tablosu:** SQL hazır (`supabase/site-content.sql`) ama SQL Editor'de çalıştırıldığı doğrulanmadı.
- **Uygulanmamış migration'lar (2026-10-13 ölçüldü, admin API'si gerçek oturumla çağrıldı):** `languages` tablosu YOK (`scripts/schema-languages.sql`) → admin'de "Bildiğim Diller" sekmesi "tablo yok" uyarısı verir; `messages.phone` kolonu YOK (`scripts/schema-fixes.sql`) → listeden düşülür, iletişim formu telefonu `body` içine yazar. İkisi de SQL Editor'de çalıştırılmalı; panelin uyarı metni artık ilgili dosya adını söyler (`ResourceDef.sqlFile`).
- İçerik boş: blog (`posts=0`), ek bölüm dizileri, YouTube `channelId`; bülten sağlayıcı yok → bilerek kurulmadı.
- Workers Free 10 ms CPU → tüm public rotalar `force-static`/prerender; dinamik rota sayısını artırma.

## 13. BİLİNMİYOR (kullanıcıya sorulacak)

- Google OAuth secret'ın rotate edilip edilmediği.
- Canlı `site_content` tablosunun oluşturulup oluşturulmadığı.
- Profil fotoğrafı Supabase Storage bucket adı (admin oturumu olmadan uçtan uca test edilemedi).
- Çok dilli CV belgeleri (17 locale) kararı.
- D1 / R2 kullanımı (şu an yok).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
