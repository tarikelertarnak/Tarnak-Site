# TARMAS STATE

status: ACTIVE
updated: 2026-10-12T20:40:00+03:00
protocol_path: C:\Users\TARIKELER\.config\opencode\command\tarmas.md
host: OpenCode (opencode) — see HOST.md
branch: faz-1-guvenlik last_commit: 5636da8 (yerel; push/deploy YOK)

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

phase: TARMAS / SERBEST FAZI — ANA SAYFA: HERO SIRA + FARE KAYDIRMA + QR PANEL step: KAPANDI
deployment: d71b6d48 (https://tarikelertarnak.pages.dev) — canli site ESKI BUILD (deploy kullanici onayinda) free_plan: Workers 10ms CPU
branch: faz-1-guvenlik last_commit: 5c9280a (yerel commit; push/deploy ASLA otomatik)
running_processes: next dev (turbopack) :3000 PID 19720
not: "Sohbet yukleniyor… siyah yaziyordu" + "chat sahte, gercek calissin" kapandi.
A) TANIMSIZ TEMA JETONU sinifi: `text-foreground-50/-60/-70` (16 yer, hepsi
chat-v2.tsx) → `text-foreground-500`. `-50` HeroUI'den geliyordu (temaya bagli
olmayan sabit renk), `-60/-70` hic CSS uretmiyordu. Kalici guard testi eklendi.
B) SOHBET SEMA CANLIYA UYGULANDI (SQL Editor): 3 chat tablosu + profiles 3 kolon.
Oncesi: `/api/chat/users` 500 → `peers` null → SONSUZ "yukleniyor".
Sonrasi: users 200 (2 kisi), mesaj gonderildi ve DB'ye yazildi (kanit).
`peersError` + CHAT_SCHEMA_MISSING → schemaMissing ile sonsuz yukleme sinifi kapandi.
**tsc 0 · eslint --max-warnings 0 0 · vitest 570/570 (47 dosya) · e2e 62/62 ·
11/11 negatif kontrol (byte-exact geri yuklendi, sha dogrulandi).**

## Bu tur (2026-10-12, tikler)

- Tikler metin glifi (`✓`/`✓✓`) yerine **yuvarlak inline SVG** (Material Symbols
  Rounded: `TickSentIcon` / `TickReadIcon` — `ui/icons.tsx`; Iconify CDN yok).
- Renk kurali: **SARI = gorulmedi** (gonderildi veya teslim edildi),
  **YESIL = okundu**. Tik sayisi: tek = gonderildi, cift = teslim/okundu.
- Karar saf modulde: `src/lib/chat-ticks.ts` (`tickFor`) → `{ double, color, labelKey }`;
  `aria-label` + yeni `chat.sentAt` anahtari (8 dil).
- Balon iki temada da mavi oldugu icin sabit renk dogru; olculen kontrast koda yazildi.
- **tsc 0 · eslint 0 · vitest 580/580 (49 dosya) · e2e 62/62 · 3/3 negatif kontrol.**

## Bu tur (2026-10-12, erişim + yerleşim + inert dosya) — commit 5636da8

Kullanıcı: _"erişim yok ekranı diye bişey olmaz"_ · _"ikisi yan yana tek hâlde,
panel büyütülüp küçültülebilir, 'Kime yazmak istiyorsun?' yazısı kalksın, sohbet
tam ekranı kaplasın"_ · _"Sohbet yükleniyor öyle olmasın"_ · _"bu dosya türü
yüklenemez gibi sorunlar olmasın; bir kodsa da ÇALIŞMAZ, sadece var olur"_.

**Ölçülen iki kök neden** (canlı Supabase REST probe, sır basılmadı):

1. `chat_conversations.dad2e586` = kendisiyle sohbet (`9c493862|9c493862`) ama
   `chat_participants`'ta **0 satır** → `isParticipant` false → **403 "Erişim
   yok."** Sebep: `a === b` iken iki satır aynı PK'ya düşüyor, INSERT'ün tamamı
   geri alınıyor. → `ensureParticipants()` (Set + `ignoreDuplicates`), hem yeni
   hem **mevcut** sohbet dalında → kırık sohbetler kendini onarır.
2. `user` rolünün izin listesi **boştu** → normal kullanıcı hiç konuşamıyordu.
   → `chat.send` + `chat.read` (dosya yükleme izni verilmedi).

**Karar: erişim tek yerde** — `src/lib/chat-access.ts:canSeeAllPeers()`
(`admin || isOwner`). Liste ve `action:'open'` aynı kuralı kullanır → listeye
girip 403'e düşmek yapısal olarak imkânsız; "Erişim yok." tam ekranı kaldırıldı.
Kimlik birleştirme: `resolveChatIdentity()` (`/login` `admin:<ad>` ↔ `/sign` uuid)
→ sahip iki ayrı geçmiş görmüyor.

**Yerleşim:** `chat-v2.tsx` iki panelli tek ekran; sol panel 240–560 px
(sürükle + ok tuşları, `role="separator"`, `localStorage`), sağda sohbet;
`h-[calc(100svh-19rem)]` (eski `max-w-3xl`/`max-h-[760px]`/`68svh` gitti);
yükleme → `ChatSkeleton` (`role="status"`), hata → `role="alert"` bandı;
tek kişilik listede otomatik açılış.

**Dosya:** tanınmayan/uyuşmayan içerik **hata vermez** → `.bin` +
`application/octet-stream`; `/uploads/*` zaten `attachment` + `nosniff` → çalışmaz.

**Kanıt:** tsc 0 · eslint `--max-warnings 0` (22 dosya) 0 · vitest **612/612**
(52 dosya; +32) · playwright **62/62** · dev `/chat` 200 · girişsiz uçlar **401** ·
**5/5 negatif kontrol** byte-exact (sha `a2e775a9`/`0cbc19da`/`a9b5ba30`/`299ad28b`;
5.'si `onPointerDown` kesildi → sürükleme testinden 3'ü kırıldı).

## BEKLEYEN (kullanici eylemi)

- ~~`supabase/chat.sql` + `supabase/schema.sql` ALTER'leri SQL Editor'da calistirilmali.~~
  **TAMAM (2026-10-12):** SQL Editor'da calistirildi ("Success. No rows returned");
  sonda 4 tablo + 3 kolon 200. `/api/chat/v2` artik 503 vermiyor.
- `site_content` tablosu hala YOK (PGRST205) — sohbetle ilgisi yok; ayri karar.

## KAPANANLAR (2026-10-04)

- **1102 kapatildi**: 7 public sayfa + sitemap.xml + feed.xml static ASSET. Prime 7/7 ilk denemede
  200, worker hic devreye girmiyor, 0 CPU.
- **Blog detay static**: `/blog/[slug]` `force-dynamic` -> `force-static` + `generateStaticParams`
  - `dynamicParams = false` (neden: `getLocale()` cookies() -> SSR -> 10 ms CPU asim).
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

## Bu tur (2026-10-12, hero CV odak halkasi — \"CV secilmiyor\")

Kullanici: _\"Projelerden secmeye basliyom sohbete kadar ama CV secmiyo\"_ — ana
sayfa hero'sunda Projeler -> Iletisim -> CV -> Blog -> Hakkımda -> Sohbet
butonlarinda (klavye/Tab) CV'ye gelinince HICBIR odak gostergesi yoktu.

**Olculen kok neden (derlenmis CSS probe, dev sunucusu):**

1. `HERO_BTN_FOCUS` `group-focus-within:*` kullaniyordu; Tailwind kurali
   `.group-focus-within\:ring-2:is(:where(.group):focus-within *)` — **TORUN**
   secer; sinif GRUP'un KENDISINDE (WRAP) olunca hic eslesmez.
2. `ring-primary-fg` jetonu yok (kopru adi `--color-primary-foreground`) —
   sinif derlenmis CSS'te HIC uretilmiyor (`ring-primary-fg uretilmis: false`).
   Parcalarda `focus-visible:outline-none` + kabukta olu halka = CV'de odak yok.

**Cozum:** `HERO_BTN_FOCUS = outline-none has-[:focus-visible]:ring-2
has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2
has-[:focus-visible]:ring-offset-background` — halka kabugun KENDISINE,
yalniz klavye odağında (komşu butonların :focus-visible anlamiyla ayni).

**Kanit:** derlenmis CSS'te `.has-\[\:focus-visible\]\:ring-2:has(:focus-visible)`

- `--tw-ring-color: var(--tprimary)` uretildi; SSR HTML'de kabuk siniflarinda
  `group-focus-within` kalmadi; split-button.test.tsx +3 regresyon (kaynak
  sozlesme + jeton koprusu + statik cikti; 613->615 test).
  tsc 0 · eslint --max-warnings 0 (3 dosya) 0 · vitest 615/615 (52 dosya) ·
  playwright 62/62 · negatif kontrol: mutasyon (eski varyant) -> **4 test kirildi**
  -> byte-exact geri (sha `32136b7b…`) -> yesil.

## Bu tur (2026-10-12, ana sayfa: sira + fare kaydirma + QR)

Kullanici: _"Projeler İletişim CV Blog Hakkımda Sohbet sırası şu şekil olsun
Hakkımda, Projeler, Blog, İletişim, Sohbet, CV"_ · _"fare animasyonu varya ana
sayfada üstte ona basınca hakkındaya gidiyor ama çok az gidiyo üstte siyah boş
kısım oluyo daha fazla kaydırmalı"_ · _"qr kod kısmı kötü o kısmıda iyileştir"_.

1. **SIRA** (hero-section.tsx): altı buton yeniden dizildi — Hakkımda
   (/about/) → Projeler (/projects/) → Blog (/blog/) → İletişim
   (/contact/) → Sohbet (/chat/) → **CV** (CvPicker, en sonda).
   Guard: hero-section.order.test.ts (kaynak sözleşmesi — href dizisi +
   CvPicker son sırada).
2. **FARE (SCROLL)** — ölçülen kök neden: scrollIntoView(#about) üç şeyi üst
   üste bindiriyordu: (a) Section'ın bsolute -top-20 sm:-top-24 çapa div'i
   (bölümün 80-96px YUKARISI), (b) [id]{scroll-margin-top:88px}, (c)
   html,body{overflow-x:hidden} + scrollIntoView'un Chrome/WebKit'te KISA
   kaydırma davranışı → bölüm ~168px aşağıda, üstte siyah boş şerit.
   ÇÖZÜM: src/lib/hero-scroll.ts (heroScrollTop, ofset 80px) → başlık (h2)
   sabit üst çubuğun hemen altına window.scrollTo ile gelir. Guard:
   hero-scroll.test.ts (5 test).
3. **QR** (card-qr.tsx): çift kutulu "yüzen kare" → TEK beyaz panel
   (
   ounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-foreground/20), QR
   132→**148px**, marginSize 1→2; metin YOK kuralı korundu. Guard:
   card-qr-only.test.ts +2 (\"qr panel stili\").

**Kanıt:** tsc 0 · eslint --max-warnings 0 (6 dosya) 0 · vitest **625/625**
(54 dosya; +10) · playwright **62/62** · SSR probe: hero href sırası
/about/ → /projects/ → /blog/ → /contact/ → /chat/ → CV, scrollIntoView
kalmadı, QR yeni panel sınıfları HTML'de. **NEGATIF KONTROL (3/3):**
(%TEMP%\opencode\negctl-hero.cjs) ofset işareti ters → 4 test; ilk buton
/x/ → 1 test; QR 148→132 → 1 test = **6 test kırıldı** → üçü de byte-exact
geri (sha 9cd12b26/761169a9/56910523) → yeşil.
