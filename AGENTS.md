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
- Test: `pnpm test` (`vitest run`) → **688 test / 62 dosya geçti**
- E2E: `pnpm exec playwright test` — **BASE_URL `localhost`** (127.0.0.1 DEĞİL, §12), port `PLAYWRIGHT_PORT` ile değişir. `e2e/admin-panel.spec.ts` gerçek tarayıcıda paneli doğrular.
- Lint: `pnpm lint` = `eslint . || true` ⚠️ **Windows'ta kırık** (`|| true` cmd/pwsh'te tanınmaz) → `pnpm exec eslint .` kullan
- Lint (kapı): `pnpm lint:strict` (`eslint . --max-warnings 0`) → şu an **687 hata** (hepsi stil, 663 auto-fix)
- Deploy: `bash scripts/deploy-pages.sh` (WSL) — **ASLA otomatik, kullanıcı onayı şart**

**Deploy akışı (WSL):** rsync → `~/tarnak-build` → `pnpm install --frozen-lockfile` → `CI=true pnpm opennext:build` → `node scripts/pages-copy-worker.cjs` → `npx wrangler pages deploy .open-next --project-name tarikelertarnak --branch master` → tüm public rotalar 200 olana kadar PRIME (1102 önlemi). `pnpm.ps1`/`.cmd` çalışmaz; `pnpm.exe` tam yolunu kullan.

## 3. Klasör haritası

- `src/app/` — rotalar. Public: `/` `/projects` `/blog` `/blog/[slug]` `/about` `/credits` `/donate` `/contact` `/uses` `/now` `/changelog` `/gizlilik` `/kvkk` `/github/[owner]/[repo]`; uygulama: `/chat` `/login` `/sign` `/admin`; meta: `sitemap.ts` `robots.ts` `feed.xml` `opengraph-image`; `api/*` route handler'ları.
- `src/components/` — `ui/`, `admin/`, `sections/` (Hero/About/Projects/Blog/Contact), `chat/`, `projects/`, `about/` (`/about` görünümü) + tekiller (`TopBar`, `Sidebar`, `Footer`, `Navigation`, `SearchDialog`, `MusicPlayer`, `Shortcuts`, `ScrollSpy`, `Providers`, `ThemeInitScript`…).
- `src/lib/` — `content.ts` (içerik+Supabase merge), `auth.ts`, `blog.ts`, `chat.ts`, `chat-db.ts` (sohbet DB katmanı), `i18n(-server).ts`, `phase6.ts` (ek bölümler şeması — `content.phase6` anahtarı korunur), `section-fields.ts` (admin alan tanımları), `permissions.ts`, `rate-limit(-kv).ts`, `kv-cache.ts`, `csp-nonce.ts`, `site-url.ts`, `breadcrumb.ts` (301 haritası), `vcard.ts`, `image-crop.ts`, `google-auth.ts`, `supabase/{client,server,session,middleware,admin}.ts`, `admin/{resources,data,overview,csv}.ts`, `scroll.ts` (kaydırma tek yardımcısı — `smoothScrollTo` ailesi), `about-page.ts` (`/about` içerik şeması, yerelleştirme, anahtar üretimi).
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
- `/admin` girişi **istemci tarafında** ( `AdminGate` → `/api/admin/session`); `role !== 'admin'` → "Yetkisiz Erişim". **Sunucuda `getSessionUser()` ÇAĞIRMA** — kök layout `force-static` olduğu için orada `cookies()` boş döner (§12), sayfa sunucuda oturumu hiç göremez. `dev-role` cookie bypass'ı **kaldırıldı** — geri EKLEME.
- Zorunlu yetki kontrolü **API katmanında**: bütün `/api/admin/*` uçları `isAdminUser()` ile 401 döner. Sayfa/istemci kapısı yalnızca UX'tir, güvenlik sınırı değildir.
- Proxy session refresh yalnızca `/api /admin /auth /chat /login /puck /sign` prefix'lerinde (CPU tasarrufu).

## 6. Ortam değişkenleri (yalnızca adlar — değer yazma)

`NEXT_PUBLIC_SITE_URL` · `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE` · `NEXT_PUBLIC_GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `GOOGLE_ADMIN_EMAIL` · `GITHUB_TOKEN` · `CLOUDFLARE_API_TOKEN` · `ADMIN_SECRET` · `NEXT_PUBLIC_TURNSTILE_SITE_KEY` · `TURNSTILE_SECRET_KEY` · `ARCJET_KEY` · `FORM_BOT_PROTECTION` · `DISCORD_WEBHOOK_URL` · `CONTACT_NOTIFY_EMAIL` · `SENTRY_DSN` · `SENTRY_AUTH_TOKEN` · `NEXT_PUBLIC_ADSENSE_CLIENT` · `CF_PAGES_URL` · `MAINTENANCE_MODE` · `MAINTENANCE_LANG` · `CSP_ENABLED` · `EXPORT_MODE`. Şablon: `.env.example`; `.env*` gitignore'da (`.env.example` hariç).

## 7. Tasarım jetonları

- `src/app/tokens.css`: `--radius-xs..full` (4→16px), `--space-1..16`, `--text-xs..3xl` (clamp), `--leading-*`, `--duration-fast|base|slow`, `--ease-out`.
- `src/app/globals.css` — `html[data-theme='light'|'dark']` blokları: `--tbg` (#fff / #0a0a0c) · `--tsurface-0..3` (katman hiyerarşisi) · `--tsurface-border` · `--tsplit-divider` · `--tfg-200..950` · `--tprimary` (**light #3b82f6 / dark #2563eb**) · `--tprimary-fg` (**light #000000 / dark #ffffff**) · `--tsecondary(-fg)`. Tailwind köprüsü: `--color-primary`, `--color-foreground-*` → `bg-primary`, `text-primary-fg`, `text-foreground-500`…
- **`--section-gap: 24px`** (globals.css ~371): başlık → butonlar → içerik dikey boşluğunun TEK kaynağı. Bölümler `<div className="h-[var(--section-gap)]" />` ve `SectionTitle tightGap` ile uygular; elle `mt-*`/`pb-*` yazma.
- **Kaydırma jetonları (2026-10-17):** `--header-height: 80px` + `--scroll-offset: 16px`; `[id] { scroll-margin-top: calc(var(--header-height) + var(--scroll-offset)) }` = **96px**. Aynı toplam JS tarafında `src/lib/scroll.ts` (`SCROLL_OFFSET`); sayısal ikizi `src/lib/hero-scroll.ts` (`HERO_SCROLL_BAR` 80 + `HERO_SCROLL_GAP` 16). **Sayfa içi kaydırmalar `lib/scroll` üzerinden** yapılır (`scrollToTop`/`scrollToY`/`scrollToElement`/`scrollByY`); elle `window.scrollTo({top:0,behavior:'smooth'})` veya `scrollIntoView` yazma — `scroll.test.ts` bunu yapısal olarak yasaklar. Kapsayıcı içi kaydırmalar (sohbet mesaj alanı, admin sekme şeridi, combobox) bilerek hariçtir.
- HeroUI renkleri `src/hero.ts`. Seçim rengi, ince scrollbar, `:focus-visible` halkası (2px `--tprimary`) hep jetondan.

## 8. Buton stili (TEK kural)

- `src/components/ui/button.tsx` masterClass — `solid + primary`: `!bg-primary !text-primary-fg !opacity-100 hover:!bg-primary/90 dark:!bg-primary/80 dark:hover:!bg-primary/70`.
- **Mavi zemin; metin/ikon açık temada SİYAH (`--tprimary-fg` #000), koyu temada BEYAZ (#fff).** Yükseklik tek sabit **40 px (`!h-10`)**; `size` yalnızca font/padding değiştirir. İkon-only `!h-10 !w-10`.
- SplitButton/hero butonları aynı dil: `src/components/ui/hero-button-style.ts` (mavi zemin, `border-primary-fg` çerçeve, 13 px/fw500, 40 px).
- **Kenarlık + köşe (2026-10-17, canlı ölçümle eklendi):** `solid + primary` butonların sınıfı `primarySolidClass()` üretir — `!border !border-primary-fg` (açık temada siyah, koyu temada beyaz kenarlık) + `!rounded-md` (= `--radius-md` 8px). Ölçüm öncesi bu butonlar `border-width: 0px` / `border-radius: 0px` çiziyordu; hero/split butonları ise 1px kenarlık + 8px köşe → aynı sayfada iki buton dili vardı. **İkon-only buton `!rounded-md` almaz** (`shape="circle"` korunur).
- **Kayma yasağı:** hover/active yalnızca `background-color` değiştirir. Geometriye dokunan utility (`hover:translate-*`, `hover:scale-*`, `hover:h-*`, `hover:py-*`, `hover:border-2`) buton/buton-benzeri öğelerde YASAK — `button.test.ts` kaynak taramasıyla engeller. (Kart ve dekoratif ikonlardaki `hover:-translate-y-1` bilinçli tasarım dilidir, bu yasak onları kapsamaz.)

## 9. Tema mantığı

- `html` üzerinde `class="dark|light"` + `data-theme`; `ThemeInitScript` parse anında `localStorage`'dan okur (FOUC yok); SSR ilk boyama `force-static` layout'ta `defaultTheme` (auto/system → dark). `<html>`/`<body>` `suppressHydrationWarning` — kaldırma, hydration uyarısı döner.
- CSS değişkenleri `html[data-theme=…]` seçicisiyle (0,1,1 > `:root`) tanımlı — tema değerlerini `:root`'a yazarsan KAYBEDER.
- Dil: `site-locale` cookie + `Accept-Language` (`src/lib/i18n.ts`); yol bazlı dil routing'i YOK.

## 10. Yeniden kullanılabilir bileşen & hook'lar

- `ui/`: `Button`, `Card`, `Modal`, `Drawer`, `Input`, `Textarea`, `Link`, `Section`/`SectionTitle`, `Skeleton`, `SplitButton`, `searchable-combobox`, `phone-input`, `country-select`, `command` (cmdk), `star-rating`, `bento-box`, `load-more-button`, `cv-picker`, `cn`.
- Global: `TopBar`, `Sidebar`, `Navigation`, `Footer`, `SearchDialog` (⌘/Ctrl+K), `MusicPlayer`, `ScrollToTop`, `SkipLink`, `Shortcuts` (Ctrl+K/B//), `ShortcutHelp` (`?`), `ScrollSpy`, `AnnouncementBanner`, `ThemedBackground`, `ReadingProgress`.
- `admin/`: `AdminGate` (**istemci kapısı** — `/admin` sayfası bunu render eder; oturumu `/api/admin/session`'dan okur, ilk veriyi `GET /api/admin/content`'ten çeker), `AdminPanel` (5 sekme: Genel Bakış / Profil & Hakkımda / İçerik & Veri / Site Ayarları / Mesajlar & Kullanıcılar; alt gruplar `SubSection`), `ScrollableTabs` + `useScrollState` (oklar uçlarda, nokta göstergesi YOK — `TabScrollDots` kaldırıldı), `TabLabel`, `DataManager` (kaynak CRUD+CSV), `ChatPanel`, `SectionsEditor` (eski adı: `Faz6Editor`), `OverviewPanel`, `UsersPanel`, `ProfilePhotoUploader`.
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
- **`public.site_content` TABLOSU YOK — admin içerik kaydetmesi hiç kalıcı olmadı (2026-10-17, canlı ölçüm).** `GET /rest/v1/site_content?select=id&id=eq.main` → `404 PGRST205 "Could not find the table 'public.site_content' in the schema cache"`. Aynı anda `chat_messages` 200 döndüğü için proje ayakta; eksik olan tablonun kendisi. Sonuç: `getContent()` her zaman gömülü `data/content.json`'a, `saveContent()` ise disk fallback'ine düşüyordu (Workers'ta yazılamaz) → **admin panelden yapılan içerik düzenlemeleri hiçbir zaman yayına yansımadı.** Çözüm: Supabase SQL Editor'de sırayla `supabase/site-content.sql` ve `supabase/about-page.sql` çalıştırılmalı. Otomatik çalıştırma MÜMKÜN DEĞİL: `exec_sql` RPC'si de yok (`404 PGRST202`) → `scripts/apply-sql.cjs` çalışmaz; `scripts/apply-schema.mjs` ise `SUPABASE_DB_PW` ister (yerel `.env.local`'da yorum satırı, değer yok).
- **`/about` bu yüzden şu an HATA durumu gösterir** (`about.errorTitle` + "Tekrar Dene"), boş durum değil: tablo yokluğu gerçek bir okuma hatasıdır ve "içerik yok" gibi gösterilmesi sessiz veri kaybı olurdu. Tablo oluşturulunca `aboutPage` yoksa **boş durum** (`Hakkımda içeriği yakında`), seed çalıştırıldıysa içerik görünür. Teşhis için `readSupabaseContent()` hata mesajını sunucu loguna yazar (`[content] site_content okunamadı: …`).
- **zod 4 `z.object` tuzagı (2026-10-17'de gerçekleşmiş, düzeltildi):** `contentSchema` bilinmeyen anahtarları SESSİZCE SİLER. `phase6` alanı şemaya eklenmediği için her admin içerik kaydetmesi ek bölümleri siliyordu. Yeni alan eklerken `validations.ts`'e yazmak ZORUNLU; API handler'ı da doğrulanmamış alanları `parsed.data.x ?? current.x` ile korur.
- **Uygulanmamış migration'lar (2026-10-13 ölçüldü, admin API'si gerçek oturumla çağrıldı):** `languages` tablosu YOK (`scripts/schema-languages.sql`) → admin'de "Bildiğim Diller" sekmesi "tablo yok" uyarısı verir; `messages.phone` kolonu YOK (`scripts/schema-fixes.sql`) → listeden düşülür, iletişim formu telefonu `body` içine yazar. İkisi de SQL Editor'de çalıştırılmalı; panelin uyarı metni artık ilgili dosya adını söyler (`ResourceDef.sqlFile`).
- **KÖK LAYOUT `force-static` TUZAĞI (2026-10-13, ölçüldü):** `src/app/layout.tsx:58` `export const dynamic = 'force-static'` Next 16'da **alt segmentlerde `cookies()`'ı BOŞ döndürüyor** ("forcing cookies/headers to return empty values"). Yani `force-static` altındaki HİÇBİR sayfa sunucu tarafında oturum okuyamaz; sayfanın kendi `force-dynamic`'i veya iç içe bir layout bunu EZEMEZ (üçü de deneyle doğrulandı). Bu yüzden `/chat` (2026-10-11) ve `/admin` (2026-10-13) oturumu **istemcide** çözüyor. Kök layout'un `force-static`'i KALMALI (public sayfalar `getLocale()` ile cookie okuyor; dinamik olsalardı Free 10 ms CPU bütçesi aşılırdı) — kalıcı çözüm budur, ayarı silmek 1102 hatasını geri getirir. **Yan etki (2026-10-13 ölçüldü):** `/login` ve `/sign` içindeki "giriş yapmışsa formu gösterme / `next`e yönlendir" bloğu bu yüzden **etkisizdir** (geçerli cookie ile `/api/admin/session` 200, `/login` 200-form). Zararsızdır — kullanıcı formu doldurup giriş yapabilir; bloklar silinmedi ki kök layout değişirse kendiliğinden çalışsın. `/admin` oradan farklıdır: orada **kilitli kalma** vardı (panel hiç açılamıyordu), o yüzden istemci kapısına çevrildi.
- **Windows'ta dev hidrasyonu 127.0.0.1'de ÇALIŞMAZ (2026-10-13, ölçüldü):** Next 16 dev sunucusu `/_next/hmr` gibi dev kaynaklarını `127.0.0.1`'den gelince "cross-origin" sayıp blokluyor → istemci JS'i hiç çalışmaz, SSR HTML görünür ama buton/form tepki vermez. Belirti "sunucu hydrate olmuyor" sanılır, kökü test adresidir: **`localhost` kullan.** `playwright.config.ts` bu yüzden `localhost`'a bağlanır. (Kalıcı alternatif: `next.config.mjs` → `allowedDevOrigins: ['127.0.0.1']`.)
- **Çok gün açık kalan `next dev` modül grafiğini bayatlatıyor:** dosya yeniden adlandırıldıysa eski süreç "Module not found" durumunda takılı kalır (HMR soketi bloklu olduğu için kendini toparlayamaz) ve test/ölçüm UYGULAMAYI değil o süreci ölçer. Şüphelenince sunucuyu yeniden başlatın; e2e için `PLAYWRIGHT_PORT` ile izole taze sunucu kullanılabilir.
- İçerik boş: blog (`posts=0`), ek bölüm dizileri, YouTube `channelId`; bülten sağlayıcı yok → bilerek kurulmadı.
- Workers Free 10 ms CPU → tüm public rotalar `force-static`/prerender; dinamik rota sayısını artırma.

## 13. BİLİNMİYOR (kullanıcıya sorulacak)

- Canlı `site_content` tablosu: **YOK** (2026-10-17 ölçüldü — §12'ye bakınız; çözülmüş bilinmez).
- Google OAuth secret'ın rotate edilip edilmediği.
- Profil fotoğrafı Supabase Storage bucket adı (admin oturumu olmadan uçtan uca test edilemedi).
- Çok dilli CV belgeleri (17 locale) kararı.
- D1 / R2 kullanımı (şu an yok).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
