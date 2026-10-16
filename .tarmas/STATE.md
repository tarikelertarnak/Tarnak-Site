# TARMAS STATE

status: ACTIVE
updated: 2026-10-15T00:00:00+03:00
protocol_path: C:\Users\TARIKELER\.config\opencode\command\tarmas.md
host: OpenCode (opencode) — see HOST.md
branch: faz-1-guvenlik last_commit: ec46dc8 (chat local-first) + 574ea5a (brand hover) + 4cd4c97 (emoji boyut) + 7532fc3 (STATE); push/deploy YOK
commit engeli COZULDU (2026-10-14): onceki turlarda commit takiliyordu; kok neden
Roaming\npm altindaki pnpm kisayolu bozuktu → pnpm.exe tam yol kullan
(WinGet: AppData\Local\Microsoft\WinGet\Packages\pnpm.pnpm_...\pnpm.exe).

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

phase: SOHBET — YANIT/ALINTI (reply) + TİK MANTIĞI (gönderildi/iletildi/okundu) step: TAMAMLANDI (yerel; push/deploy YOK)
prev_phase: SOHBET — LOCAL-FIRST PRESENCE + HEADER BRAND HOVER + CHAT PANEL RESIZE (HER ZAMAN) step: TAMAMLANDI (commit da1fe5f; push yok)
deployment: d71b6d48 (https://tarikelertarnak.pages.dev) — canli site ESKI BUILD (deploy kullanici onayinda) free_plan: Workers 10ms CPU
branch: faz-1-guvenlik last_commit: yerel (ayrinti: LOG.md [CHAT-011..013]; push/deploy ASLA otomatik)
running_processes: next dev (turbopack) :3000 — KULLANICININ; bu turda degisiklikleri SERVIS ETTIGI yeniden olculdu (gercek Chromium e2e + API probe) → bayat modul grafigi belirtisi yok
not: HEADER BRAND HOVER — TEK BÜTÜN (2026-10-15, commit 1062471): kullanıcının
"tıklama alanı ve hover tek bütün olarak çalışsın" isteği. İlk uygulama
span-başına `hover:` idi → logo/boşluk üzerine gelince hiçbir şey olmuyordu.
KÖK NEDEN 2 GİZLİ BUG: (1) TopBar logosunda `group-hover:opacity-80` VARDI ama
link'te `group` YOKTU → logo tepkisi hiç çalışmıyordu; (2) span'lerdeki
`focus-visible:*` sınıfları ÖLÜ koddu (span odaklanamaz). ÇÖZÜM: link'e `group`,
span'lere `group-hover:`/`group-focus-visible:`, span'lerdeki ölü
focus-visible:* silindi (link'in halkası global :focus-visible kuralından,
tokens.css:139). Sidebar brand tiklanabilir Link oldu (`ariaLabel="Ana sayfa"`
— ui/link bileşeni ham `aria-label` attribute'unu sessizce düşürüyor, prop adı
`ariaLabel`). CANLI DOĞRULAMA (gerçek Chromium, localhost:3000): logo hover'da
TARIK ELER rgb(237,237,237)→rgb(37,99,235), — →primary, TARNAK→primary/70,
logo opacity 1→0.8; Sidebar ve TopBar AYNI davranış. tsc 0 · vitest 726/726 ·
eslint (2 dosya) 0 · commit 1062471 YEREL.
not: LOCAL-FIRST PRESENCE (2026-10-14, son istek): "aktiflik herşeyi supabase den seçiyo ama bile bilceği bişeyse benim aktif olup olmadığım bişey yazıp yazmadım sabitleyip sabitlemediğim gibi bunlar bilgisiyarımda yapılır sonra gidecekse yüklencekse yüklenir bölece daha hızlı olur".

- KENDİ ÇEVRIMİÇİ DURUMU: sekme odaklı + kullanıcı etkileşimi (fare/klavye/dokunma/kaydırma) ile yerel hesaplanır (anlık, ağ gecikmesi YOK).
- SUNUCU SENKRONU: periyodik (5 dk) + sekme gizlenince/kapanırken + yazma durumu değişiminde. `last_seen_at` tazelenir; `presence_state` sadece typing/uploading/recording iken yazılır.
- LİSTE POLL_MS KALDIRILDI: 2 sn'de bir `/api/chat/users` çekmek YOK → 30 sn'de bir (PEERS_REFRESH_MS). Yazma durumu yine anlık görünür çünkü sunucu her keystroke'ta presence günceller.
- BAŞKALARININ DURUMU: sunucudan gelen `lastSeenAt` + `presenceState` + yerel `now` ile hesaplanır (chat-peers mantığı değişmez).
- TYPESCRIPT 0 · VITEST 726/726 (63 dosya) · ESLINT --MAX-WARNINGS 0 (chat + i18n + e2e) 0.
  DEĞİŞEN DOSYALAR: `src/components/chat/chat.tsx` (local-first mantığı), `src/lib/chat-db.ts` (`touchPresence` force parametresi), `src/app/api/chat/route.ts` (force aktarım), `src/components/chat/chat.admin.test.tsx` (yazma sinyali testi güncellendi).
  "TARIK ELER (Siz)" yazar; tam istedigi dize icin profil tam adi
  `TARIK ELER TARNAK` olmali (sahip satiri veri API'sinde korumali → 403;
  kendi profil ucu `/api/auth/profile` ile düzenlenir).
  **tsc 0 · eslint --max-warnings 0 (chat + i18n + e2e) 0 · vitest 724/724 (63
  dosya) · `e2e/chat-fixes.spec.ts --project=desktop` 15/15 (1 yeni test).**
  Veriye bagli e2e testi de duzeltildi: karsi taraf sohbetinde mesajlar silinmis
  oldugu icin (`last_preview: null`, admin cookie ile olculdu) test kiriliyordu →
  onizleme artik `page.route` ile YANITTA kuruluyor (kisiler/sohbetler gercek,
  Supabase'e yazilmiyor; dosyadaki "Ilet" testi de ayni desende).
  not: 8 madde (hepsi uygulandi + olculdu): (1) yan panel HER ZAMAN erisilebilir ve
  tek dugmeyle kapanip acilir (`data-testid="chat-panel-toggle"`, `>=768` sutunu
  katlar, `<768` kaplamayi acar; kapaliyken de dugme durur), (2) KENDI SATIRIM ve
  hic sohbeti olmayan kayit listelenmez ("kullanici kendisiyle de konusamasin" —
  kendi satirim "Tarnak" adiyla duruyordu ve tiklayinca `<id>|<id>` anahtarli bos
  sohbet aciyordu; ikinci savunma `openWith` icinde `peerId === selfId`),
  (3) eski "👥 kisi listesini ac" + "←" dugmeleri KALDIRILDI (← secili sohbeti de
  siliyordu), (4) sohbet SAYFASI kaymaz: `min-h-screen` her boyutta 56px tasiyordu
  → kaldirildi, kaydirma mesaj alaninda (`scrollIntoView` chat.tsx'ten cikti,
  yerine `listRef.scrollTo` + `scrollToMessage`), (5) kendi adim `TARIK ELER TARNAK`,
  (6) bos alana sag tik → "Kisi ara / Sohbeti yenile / En sona git" (sonuncu yalniz
  sohbet acikken), (7) sohbet basligina sag tik → kisi menusu, (8) secili satir
  `bg-primary/15 hover:bg-primary/20`.
  "Grup olustur" EKLENMEDI: sunucuda grup ucu YOK (`kind='group'` hic olusmuyor,
  `api/chat` grup aksiyonu yok) → calisan maddeler konuldu, uydurulmadi.
  **tsc 0 · eslint --max-warnings 0 (chat + e2e) 0 · vitest 722/722 (63 dosya) ·
  `playwright e2e/chat-fixes.spec.ts --project=desktop` 14/14 (6 yeni test).**
  Tum e2e suite 86/88 (14 atlandi) — 2 kirmizi AYNI ILGISIZ test
  (`personal-pages.spec.ts` footer navigasyonu, masaustu + mobil); kanit: spec
  HEAD'e geri alinip kosuldu, yine kirmizi + probe ile tiklama noktasi `<ul>`e
  dusuyor ve sayfa tiklama sonrasi ~784px buyuyor (yerlesim kaymasi). Bu
  degisiklikle ilgisi yok; spec DEGISTIRILMEDI.
  4 chat test dosyasi yeni kurala gore guncellendi: fiksturlere SOHBET eklendi
  (satir gorunurlugu artik sohbete bagli — yoksa liste bos kalir).
  not: 5 madde: (1) liste onizlemesi `@<son gonderen> · <onizleme>` + bos durum,
  (2) 768px altinda tek panel (liste ↔ sohbet), secim/kaydirma korunur,
  (3) dar ekranda kart tam ekran (8px kenar, `100dvh`), yazma alani kart icinde,
  (4) kisi menusu imlecte + kirpilmaz + uzun basma, (5) balon menusu imlecte
  (Kopyala/Yanitla/Ilet/Sabitle/Mesaj bilgisi/Sil); `Duzenle` YOK (edited_at
  kolonu + API yok, DDL kullanicida → dogrulanamazdi), yerine `Ilet`.
  YOLDA BULUNAN 3 GIZLI HATA: menuler `display:none` panelin icindeydi (gorunmez)
  · ilk maddeye odak `visibility:hidden` iken cagriliyordu (klavye olu)
  · kart yuksekligi belirsizdi (24 mesajda kaydirma kabi icerik boyuna cikip
  yazma alanini kartin disina itiyordu). **tsc 0 · eslint --max-warnings 0 0 ·
  vitest 717/717 (63 dosya) · `e2e/chat-fixes.spec.ts` (gercek Chromium) 8/8 ·
  tum e2e suite 44/45** — tek kirmizi `personal-pages.spec.ts` footer navigasyonu
  (bu degisiklikle ilgisiz; probe ile ayni tik GIDIYOR, spec yumusak kaydirma
  surerken tikliyor → zamanlama kirilgani). YENI DOSYA:
  `src/components/chat/context-menu.tsx` (+16 unit test) · `e2e/chat-fixes.spec.ts`.
  Kullanicinin devam eden eylemleri: SQL Editor (languages + messages.phone) ve
  canli deploy onayi.
  not: son tur 3 commit: 4bfe73e (/admin erisim duzeltmesi: oturum istemcide) · 9cc2a5d
  (e2e admin spec + playwright localhost/PLAYWRIGHT_PORT). **tsc 0 · vitest 688/688
  (62 dosya; +8 gate testi) · eslint --max-warnings 0 (6 dosya) 0 · Playwright
  admin-panel.spec.ts 12/12 (masaustu+mobil, GERCEK Chromium).**
  KOK NEDEN: kok layout `dynamic='force-static'` Next 16'da alt segmentlerde
  `cookies()`'i BOS donduruyor → /admin'daki `getSessionUser()` daima null →
  sonsuz /login yonlendirmesi (panel tarayicidan HIC acilamiyordu). Olculdu: ayni
  cookie ile /api/admin/session 200, /admin 307. Cozum /chat deseni: sayfa oturum
  okumaz, kapi istemcide (AdminGate), zorunlu kontrol API'de (401 kanitli).
  EK BULGU: dev hidrasyonunun yillarca "calismiyor" sanilmasinin koku — Next 16 dev
  `/_next/hmr`'i 127.0.0.1'den gelince cross-origin sayip BLOKLUYOR; `localhost`
  kullanilinca hidrasyon calisir (playwright config duzeltildi).
  not: 4 commit: 2bf3ebf (admin 5 sekme + serit + uyari) · ff74999 (chat v2 adlari
  kaldirildi) · ea7d67d (Faz 1..6 yorum/dokuman adlari) · b5cf083 (e2e/docs/CI ad
  temizligi). **tsc 0 · vitest 680/680 (61 dosya) · eslint --max-warnings 0 (81
  dosya) 0.** Gercek admin oturumuyla API olcumu: /api/admin/overview sayilari DB
  ile ayni. Iki migration eksik (languages tablosu, messages.phone) → panel uyarisi
  artik ilgili SQL dosyasini soyluyor (`ResourceDef.sqlFile`).
  DIKKAT: commit aninda lint-staged hatasi "The command line is too long" (82 dosya
  tek eslint komutunda Windows limitini asti) → degisiklikler 4 mantiksal commit'e
  bolundu; kapi ATLANMADI (`--no-verify` kullanilmadi).
  BU TURDA YAPILAMAYAN: gercek tarayicida tiklayarak dogrulama (dev sunucu
  hydrate olmuyor: `_next/hmr` ws `ERR_INVALID_HTTP_RESPONSE`; BrowserOS neo
  bagli degil) → kanit jsdom + kaynak sozlesmesi + HTTP olcumu.
  not: ROZET 2 kapandi (5 kullanici istegi) →
  A) `/chat`: "Sohbet" baslik blogu SILINDI (yer israfi); kutu `100svh-19rem`
  → `100svh-11rem`, bosalan alani doldurur.
  B) "Onemli kisi olarak isaretle" sag ustten KALDIRILDI → kisiye sag tik menusunde
  (`chat.markImportant` / yeni `chat.unmarkImportant`, 8 dil).
  C) Kucuk ekranda liste KAPLAMA olarak acilir; acma dugmesi "←" okundan ONCE;
  X ile kapanir (`md` ve ustunde sabit sutun aynen kalir).
  D) Admin sekme oklari: `absolute top-1/2` (Tablolar kartlarinin ustune biniyordu)
  → seritle ayni flex satirinda, kendi alaninda; `scrollBy` 200px; aktif sekme
  ortalanir; scrollbar gizli. Alttaki 4 daire (`TabScrollDots`) + olu sayfalama
  API'si SILINDI.
  E) Rol etiketi "Super Yonetici" → "Site Sahibi"; panel kimlik blogu gruplandi.
  F) Yazma alani: mavi odak halkasi kapatildi (`.chat-composer-field`);
  `input::selection` ozel kurali SILINDI → sitedeki tek secim kaynagi
  (@lobehub/ui ThemeProvider = SARI) gecerli oldu (kok neden buydu).
  **tsc 0 · eslint --max-warnings 0 (21 dosya) 0 · vitest 647/647 (57 dosya) ·
  e2e chat-layout 12/12 (masaustu + mobil, 5 yukseklik) · /chat SSR h1/h2 = 0 ·
  servis edilen CSS'te `.chat-composer-field` + `.admin-tabs-strip` var.**
  DIKKAT: commit aninda lint-staged prettier `globals.css`i TUMUYLE yeniden
  bicimlendirdi (1952 satir; tirnak stili + girinti, davranis ayni) → CSS metnini
  string ile esleyen 2 test tirnak-bagimsiz hale getirildi (`theme-contrast.test.ts`
  satir ~361, `scrollable-tabs.test.ts`).

## Bu tur (2026-10-16, SOHBET: YANIT/ALINTI + TIK MANTIGI)

Kullanici 2 istek verdi; ikisi de kapandi: (1) mesaj **yanitlama** (alinti) akisi
bastan calisir hale gelsin, (2) mesaj durum **tikleri** dogru mantiga cevrilsin
(gonderildi/iletildi/okundu; YESIL kullanma) + eski yanlis "okundu"
kayitlarini duzeltecek migration/script yazilsin.

**KOK NEDEN (olculdu, tikler):** `GET /api/chat?conversationId=X` mesajlari
cekerken `markRead(conversationId)` + `markDelivered(conversationId)` cagiriyordu
ve `chat-db.ts`'teki bu iki sorguda **`sender_id` filtresi YOKTU** → kullanici
KENDI sohbetini acinca KENDI mesajlari "okundu" damgasi aliyordu (alici mesaji
hic gormemisken gonderende cift mavi tik). Ek olarak istemci mesaji iyimser
eklerken sunucu damgasiz satiri dogrudan cift tikle gosterebiliyordu.

**Kararlar / duzeltmeler:**

1. `markDelivered`/`markRead` imzalarina ZORUNLU `viewerId` eklendi +
   `.neq('sender_id', viewerId)`; `GET`ten `markRead` TAMAMEN cikarildi, yeni
   `action: 'read'` POST'u eklendi. Istemci yalniz (a) sohbet acik, (b) sekme
   gorunur, (c) mesaj listesi gorunur alanda (IntersectionObserver), (d) karsi
   taraftan okunmamis mesaj VARSA cagirir → yoklama bosa POST atmaz.
2. Tik karari saf modulde: `chat-ticks.ts` — `TICK_PENDING_COLOR`
   (`text-primary-fg/60`, soluk gri) = gonderildi/teslim edildi,
   `TICK_READ_COLOR` (`text-sky-300`) = okundu; YESIL/SARI hic yok (negatif
   testle sabitlendi). `tickFor(m, { pending, failed })` → saat / kirmizi unlem.
   `state` alani eklendi; liste tiki AYNI karardan (`tickForFlags`) gecer ama
   rengi `TICK_LIST_COLORS`ten secilir — balon mavi oldugu icin `sky-300` seffaf
   liste zemininde okunmazdi.
3. Yanit ozeti kurali SAF `lib/chat-reply.ts`'e tasindi (sunucu + istemci ayni
   kurali kullanir; `chat-db.ts` sunucu Supabase istemcisi icerdigi icin
   istemciden deger olarak import EDILEMEZ): `toReplyPreview` metni 150 karaktere
   kirpar, SILINMIS mesajin metni/dosyasi ALINTIYA TASINMAZ (guvenlik),
   `missingReplyPreview` fiziksel silinmis hedef icin "silindi" der.
4. `listMessages` → `attachReplyPreviews`: tum `reply_to_id`'ler TEK `in()`
   sorgusunda (N+1 yok); hic yanit yokken alan yine `null`'a normalestirilir.
5. `sendMessage` `replyToId`'yi sohbetle DOGRULAR (baska sohbetin mesajina yanit
   dusurulur; mesaj kaybolmaz, yanitsiz yazilir).
6. Arayuz: hover'da yanit oku (ayni mesaj menusunu acar — ikinci menu
   YAZILMADI), sag tik menusunde "Yanitla", mobilde saga kaydirma
   (`use-swipe-reply.ts`, esik 60px, dikey niyet iptal, `navigator.vibrate(10)`,
   `transform` dogrudan yazilir — React state'i YOK). Giriş ustu onizleme
   (gonderen rengine gore sabit serit, kendim icin mavi, `line-clamp-2`, X/Esc,
   sohbet degisince temizlenir, `data-testid="chat-reply-preview"`). Balon ici
   alinti blogu (tiklayinca kaynaga gider). Ayrica iyimser gonderim: mesaj once
   "saat" durumunda girer, hata olursa kirmizi unlem + "Tekrar dene" — tik
   HICBIR ZAMAN dogrudan cift tikle baslamaz.
7. Migration/onarim: `supabase/chat.sql` sonuna (a) `add column if not exists
reply_to_id / delivered_at / read_at` + kismi indeks, (b) eski yanlis
   damgalari temizleyen onarim betigi eklendi (kesin imkansiz satirlar +
   kaynagi guvenilmez damgalar; yeni kod dogrusunu yeniden yazar →
   kendini iyilestirir).

**KANIT:** `tsc --noEmit` **0** · `vitest run` **773/773 (65 dosya)** ·
`eslint --max-warnings 0` (13 degisen dosya) **0** · dev `/chat` HTTP **200** ·
`POST /api/chat action:read` girissiz **401**.
Yeni test dosyalari: `src/lib/chat-reply.test.ts` (11),
`src/components/chat/use-swipe-reply.test.ts` (8); guncellenenler:
`chat-ticks.test.ts` (yeni renk/state sozlesmesi), `chat-db.test.ts` (neq/insert
kaydi + yanit ozeti + yanit dogrulama testleri), `chat.test.ts` (yeni
2026-10-16 sozlesme bloklari), `chat.admin.test.tsx` (iyimser gonderimle bos
sohbet CTA'si DOM'dan kalkar).
**KANIT YOK:** gercek tarayicida tiklayarak dogrulama — BrowserOS neo bagli
degil (`neo_*` araclari oturumda yok) → baska araca DUSULMEDI; kanit jsdom +
kaynak sozlesmesi + HTTP olcumu. Kullanici tarayicida denemeli.

**BEKLEYEN KULLANICI EYLEMI (bu tur):** `supabase/chat.sql`i SQL Editor'de bir
kez calistir (kolonlar + eski yanlis damga onarimi). Kod canliya cikmadan
calistirmak yeterlidir; tekrar calistirmak zararsizdir.

## Bu tur (2026-10-13, /ADMIN ERISIM HATASI + ILK GERCEK TARAYICI DOGRULAMASI)

Kullanici: "gereksiz contexti sil, yeni fazlara baslayalim". Tarayici
dogrulamasini (kapanmamis tek kanit boslugu) kapatmak icin Playwright spec
yazildi — ve spec ILK KOSUSUNDA gercek, kritik bir hata buldu.

1. **BULGU (kritik): /admin tarayicidan HIC acilamiyordu.** Kok neden olculdu
   ve deneyle izole edildi: `src/app/layout.tsx:58`
   `export const dynamic = 'force-static'` Next 16'da alt segmentlerde
   `cookies()`'i BOS donduruyor (dokuman: "forcing cookies/headers to return
   empty values") → `/admin` sayfasindaki `getSessionUser()` admin_session
   cookie'si GECERLI olsa bile daima null → `redirect('/login?next=/admin')`.
   Kanit: ayni istek/ayni cookie → `/api/admin/session` 200 + admin kullanici,
   `/admin` 307 → /login. Deneyler (izole kopyada, gercek dev sunucusu):
   force-static + sayfada force-dynamic = cookies() BOS; ic ice
   `admin/layout.tsx` force-dynamic = BOS; kok layout notr = `['admin_session']`.
2. **DUZELTME** (`4bfe73e`): `/chat`'te 2026-10-11'de kullanilan desen aynen
   uygulandi — sayfa oturum okumaz, kimlik kapisi istemcide, zorunlu kontrol
   API katmaninda. Yeni `src/components/admin/admin-gate.tsx`:
   `/api/admin/session` → yok ise `/login`e yonlendirir, admin degilse
   "Yetkisiz Erisim", admin ise paneli acar. `src/app/admin/page.tsx` artik
   yalniz `<AdminGate/>` render eden statik kabuk.
3. **Veri tazeligi:** panele `GET /api/admin/content` eklendi (content +
   messages + blogPosts, `isAdminUser()` guard). Gerekce: sayfa statik
   oldugu icin sunucu render'i build zamaninda donardi; bayat icerikle
   kaydetmek sessiz veri kaybi olurdu.
4. **Guvenlik negatif kontrol:** `/api/admin/content` cookiesiz → 401,
   bozuk imzali cookie → 401. Guvenlik siniri API'de kaldi; istemci kapisi
   yalnizca UX.
5. **EK BULGU (yillarca yanlis bilinen): "dev sunucusu hydrate olmuyor".**
   Gercek neden: Next 16 dev sunucusu `/_next/hmr` gibi dev kaynaklarini
   `127.0.0.1`'den gelince "cross-origin" sayip BLOKLUYOR → istemci JS'i hic
   calismaz. `localhost` kullanilinca hidrasyon calisir. `playwright.config.ts`
   `localhost`a baglandi (+ `PLAYWRIGHT_PORT` ile port secimi: gunlerdir acik
   dev sunucusu modul grafigini bayatlatiyor, testler yanlis sureci olcuyordu).
6. **YENI KANIT: `e2e/admin-panel.spec.ts` 12/12 (masaustu + mobil, gercek
   Chromium)** — h1 mavi alt cizgi, tam 5 sekme, her sekmenin alt bolumleri,
   kaynak seridi oklari (uclarda dogru durum + tiklayinca kayma), kaydedilmemis
   degisiklik uyarisi, TEMIZ KONSOL. Oturum cookie'si spec icinde yerel
   ADMIN_SECRET ile imzalanir (parola uydurulmaz, sir yazilmaz).

Kapilar (bu tur, HEAD=9cc2a5d): `tsc --noEmit` **0** · `vitest run`
**688/688 (62 dosya)** · `eslint --max-warnings 0` (6 dosya) **0** ·
`playwright e2e/admin-panel.spec.ts` **12/12**. Commit YEREL, push/deploy YOK.

Tuzak/ders: (a) spec'in `useRouter` mock'u her render'da YENI nesne donerse
kapinin `[router]` bagimliligi degisir, effect sonsuz donguye girer ve mock
`Response` govdesi ikinci kez okunamaz → testler yanlis yere kirmizi olur;
mock STABIL olmali. (b) Kaynak sozlesmesi testleri yorumlari da tarar:
"koddan alinti iceren yorum" testi kirar → once yorumlari strip et.
(c) Lobehub `Button` jsdom'da `ConfigProvider` ister ve patlar; kapinin
"giris gerekli" dalinda duz `Link` kullanildi (auto-yonlendirme zaten var).
(d) Windows'ta izole kopyada build icin `node_modules` junction'i CALISMAZ
(Turbopack "symlink target leaves the filesystem root" der) → kopyada gercek
`pnpm install` yapildi (3 dk, store'dan hardlink) ve is bitince kopya silindi.

Kullanici eylemi: (1) 3000'deki dev sunucusunu yeniden baslat (bayat modul
grafigi), (2) SQL Editor'de `scripts/schema-languages.sql` +
`scripts/schema-fixes.sql` (degismedi), (3) canliya deploy icin onay.

## Bu tur (2026-10-13, admin paneli yenileme + v2/faz ad temizligi)

Kullanici 6 istek verdi; hepsi kapandi. Commitler (yerel): `2bf3ebf`,
`ff74999`, `ea7d67d`, `b5cf083`.

1. **v2 adlari kaldirildi** (onceden yarim kalmisti, ajan ag hatasiyla dusmustu):
   `/api/chat` = konusma API'si (eski v2), `/api/chat/messages` = eski thread
   API'si; `api/chat/v2/` silindi. `lib/chat-v2.ts` → `chat-db.ts`,
   `chat-v2.tsx` → `chat.tsx` (`ChatV2`→`Chat`), 4 test dosyasi + `chat.v2Title`
   → `chat.pageTitle` (8 sozluk) + hiz siniri anahtari `chat-v2` → `chat-send`.
   Admin `ChatPanel` `/api/chat/messages`e tasindi (eski thread sekli korunur).
2. **Admin paneli 11 sekme → 5 grup**: Genel Bakis / Profil & Hakkimda /
   Icerik & Veri / Site Ayarlari / Mesajlar & Kullanicilar. Eski sekmelerin
   govdeleri `SubSection` basliklari altinda AYNEN korundu (alan/fonksiyon
   kaybi yok). Baslik ana sayfa bileseniyle: `SectionTitle big headingLevel="h1"`
   (sol ikon, buyuk mavi buyuk harf, mavi alt cizgi).
3. **Veri Yonetimi kaynak seridi** de `ScrollableTabs` + yeni `TabLabel`:
   oklar seridin DISINDA (en basta sol, en sonda sag; `scrollBy(200)`),
   orta sayfa oklari ve nokta gostergeleri tamamen kaldirildi, aktif sekme
   ortalanir, scrollbar gizli. Tek yeniden kullanilabilir bilesen.
4. **Kaydedilmemis degisiklik uyarisi**: sekme degisiminde `window.confirm`
   (reddedilirse sekme degismez) + mavi-yaninda amber ipucu metni; basarili
   kayitta "temiz" anlik goruntu guncellenir.
5. **Veri/CRUD dogrulamasi**: gercek `admin_session` cookie'si yerel
   `ADMIN_SECRET` ile imzalanip `/api/admin/overview` + 9 kaynak ucu cagrildi.
   Sayilar DB ile ayni (Yetenekler 6, Istatistikler 1, Mesajlar 3, Reklamlar 3,
   Profil 2, CV 1; posts/projects 0). Eksikler: `languages` tablosu YOK,
   `messages.phone` kolonu YOK → ikisi de hazir SQL dosyasina sahip
   (`scripts/schema-languages.sql`, `scripts/schema-fixes.sql`) ama SQL
   Editor'de calistirilmamis; panel uyarisi artik DOSYA ADINI soyluyor.
6. **Ad/etiket temizligi**: `Faz6Editor` → `SectionsEditor`, `faz6-fields` →
   `section-fields`, `FAZ6_BOLUMLERI` → `SECTION_SPECS`,
   `e2e/phase6-pages` → `personal-pages`, `docs/faz1-secret-sizinti` →
   `docs/secret-sizinti`; repo genelinde "Faz 1..6" yorum/CI/husky/css izleri
   gercek adlara cevrildi. `content.phase6` veri anahtari + `phase6.ts` dosya
   adi KORUNDU (kayitli icerik uyumu; `phase6.ts` basina not eklendi).
7. **Test altyapisi**: `vitest.setup.ts` (jsdom `ResizeObserver` +
   `Element.prototype.scrollTo` + `globalThis.scrollTo`) → DataManager seridini
   render eden 27 test artik geciyor. `configure({ asyncUtilTimeout: 3000 })`
   → `chat.admin.test.tsx` "Merhaba de!" testinin paralel kosudaki flake'i
   (1 sn waitFor butcesi) kapandi; 3 ardisik kosu + tam kosu yesil.
   Yeni `admin-panel.test.tsx` (10 test): baslik h1 + mavi alt cizgi, tam 5
   sekme, "Faz 6" metni hicbir yerde yok, her grubun alt bolumleri gorunur,
   onay akisi iki dalda, konsolda React uyarisi yok.

**Kanit:** tsc 0 · vitest **680/680** (61 dosya) · `eslint --max-warnings 0`
(81 degisen dosya) 0 · `/api/admin/overview` HTTP 200 + gercek sayilar ·
`admin-panel.test.tsx` 10/10 · `data-manager.test.tsx` 27/27.
**Kanit YOK:** gercek tarayicida tiklayarak dogrulama (dev sunucu hydrate
olmuyor, BrowserOS neo bagli degil) · deploy (kullanici onayi).

## Bu tur (2026-10-13, ROZET 2: sohbet sayfasi + admin sekme seridi + rol etiketi)

Kullanici 5 istek verdi; hepsi kapandi (ayrinti: LOG.md "Bu tur (2026-10-13,
sohbet sayfasi …)"). Kisa ozet:

1. **`/chat` baslik blogu silindi** (`src/app/chat/page.tsx`): `SectionTitle` +
   `ChatIcon` + `getLocalizedContent()` cagrisi kaldirildi (sayfa artik `async`
   degil). Kutu yuksekligi `100svh-19rem` → `100svh-11rem` (TopBar 56 + ust pay
   80 + slot paylari 40). `e2e/chat-layout.spec.ts` yeniden yazildi (eski test
   `main h2` ariyordu, o artik yok).
2. **"Onemli kisi olarak isaretle" sag tikta**: basliktaki ⚪/🔴 dugmesi +
   `toggleImportant` + `important` state SILINDI. `PeerMenu` girdisi artik
   `chat.markImportant` / yeni `chat.unmarkImportant` (8 dil dosyasi) yaziyor.
   API akisi ayni: `onToggle('important')` → `runAdmin` → POST `action:'important'`.
3. **Kucuk ekranda liste acma dugmesi**: `listOpen` state; aside `md` altinda
   `absolute inset-0 z-40 flex` kapama olur, kapatinca `hidden md:flex`;
   acma dugmesi (`UsersIcon`, yeni ikon) "←" okundan ONCE; X dugmesi panel
   basliginda. `md` ve ustunde davranis degismedi (sabit sutun).
4. **Admin sekme oklari** (`scrollable-tabs.tsx` kok neden: `children` hem seridi
   hem panelleri kapsadigi icin `top-1/2` sayfanin ortasina dusuyordu): oklar
   seritle ayni flex satirinda, yuksekligi olculen seritten (`stripHeight`),
   `ARROW_STEP = 200`, aktif sekme `centerScrollLeft` ile ortalanir (scrollIntoView
   YOK), kenar solmalari serit yuksekligine hizali, scrollbar
   `.admin-tabs-strip [role='tablist']` ile gizli. `tab-scroll-dots.tsx` +
   `use-scroll-state` sayfalama API'si (`pageCount`/`activePage`/`scrollToPage`/
   `scrollToEdge`/`tabPageCount`/`activeTabPage`) SILINDI.
5. **Rol etiketi**: `SUPER_ADMIN_LABEL` → `OWNER_LABEL` = "Site Sahibi"/"Site
   Owner"; `admin-panel` basliginda kimlik + rol TEK gruplu kutuda (rol rozeti
   `bg-primary/15 text-primary`). **Varsayim:** "gruplama" bu sekilde yorumlandi.
6. **Yazma alani odak/seçim**: `.chat-composer-field:focus/:focus-visible` →
   outline/box-shadow YOK (kapsam sadece bu alan; diger sayfalarin odak halkasi
   korunur). `input::selection, textarea::selection` kurali SILINDI — **olculen
   kok neden**: `@lobehub/ui` ThemeProvider global `::selection {color:#000;
background:yellow9}` enjekte ediyordu; bizim `input::selection` (0,1,1)
   ozgullugu onu EZIYORDU, o yuzden yazma alani sitenin geri kalanindan farkli
   gorunuyordu. Artik tek kaynak.

Kapi sonuclari: **tsc 0 · eslint --max-warnings 0 (21 dosya) 0 · vitest 647/647
(57 dosya) · playwright `e2e/chat-layout.spec.ts` 12/12 · /chat SSR h1/h2 = 0 ·
servis edilen CSS'te yeni kurallar mevcut.** Yeni regresyon testleri:
`src/components/admin/scrollable-tabs.test.ts` (7) + `chat-v2.test.ts` (+3) +
`use-scroll-state.test.ts` (`centerScrollLeft`) + admin menu etiket testi.

## Bu tur (2026-10-13, sohbet yazma alani + About kaydirma + "Daha Fazlasini Goster")

3 gorev, hepsi kapandi (ayrinti: LOG.md "Bu tur (2026-10-13 …)"):

1. **Sohbet yazma alani WhatsApp tarzi** (`chat-v2.tsx`): tek pill bar
   (`rounded-full bg-foreground/10 min-h-12`), icinde atac → cikartma → input
   (`bg-transparent outline-none`, kenarlik/odak halkasi YOK) → dinamik dugme.
   Dugme BOŞKEN mikrofon (`MicIcon`, "Sesli mesaj yakinda"), `draft.trim()`
   doluyken yesil `#25D366` gonder (`SendIcon`, beyaz); iki ikon ust uste
   200ms fade+scale. Eski metinli "Gonder" `Button`'u + import'u KALDIRILDI.
   Enter gonderir / Shift+Enter yeni satir (mevcut handler korundu).
2. **Kaydirma payi** (`hero-scroll.ts`): `HERO_SCROLL_BAR = 80` +
   `HERO_SCROLL_GAP = 16` → `HERO_SCROLL_OFFSET = 96` (eski 80) → sayfa 16px
   daha az kayar, baslik header altinda bosluklu. Pay TEK ayar noktasi.
3. **"Daha Fazlasini Goster" bicimi**: "-N" kaldirildi →
   "Daha Fazlasini Goster (+{n}) · {gorunen}/{toplam}"; tumu acikken
   "Daha Az Goster · toplam/toplam" + yukari chevron, tiklayinca liste ilk
   haline doner + liste basina yumusak kayar. `use-row-pagination`e
   `visibleCount`/`total`/`canCollapse`/`collapse()` eklendi. Dar ekranda rozet
   butonun ALTINDA. Toplam ilk satirlara sigiyorsa dugme YOK.
   **Bilincli sapma:** adim sabit 4 oge DEGIL, olculen satir×sutun (grid
   hizasi korunur; `+n` zaten `min(adim, kalan)`).

**tsc 0 · eslint --max-warnings 0 (21 dosya) 0 · vitest 647/647 (56 dosya; +10) ·
8 dil i18n senkron (chat.emoji, chat.voiceSoon, showLess/showLessAria) ·
dev chunk probe: yeni kod canlida.** Gorsel/tarayici dogrulamasi YOK
(BrowserOS neo bagli degil → baska araca dusulmedi).

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

## Bu tur (2026-10-12, üç kullanıcı isteği: CV seçimi · favicon mavisi · kart hizası)

Kullanıcı: _"CV yazısını seçemiyorum"_ · _"favicon her temada mavi olsun"_ ·
_"Kişisel Bilgiler kartını toparla"_.

1. **CV seçimı (UX-001):** kök neden = `split-button.tsx` kabuğunda `select-none`
   (`user-select` miras alınır → iki parça da kilitli, drag seçiminde atlanıyor;
   kardeş butonlar `select-text`). Düzeltme: kabuk + PART `select-text`.
   Canlı kanıt: her iki parça ve kabuk `userSelect: "text"`; kabuğu canlıda
   `none`'a çevirince parçalar `text` kalıyor (negatif kontrol).
   2 birim testi. **Sınır:** Playwright headless'ta sürükleme seçimi üretilemedi
   (A/B klon deneyi de ayrım yapmadı) → davranışsal fare testi kanıt değil;
   kullanıcı tarayıcıda doğrulamalı.
2. **Favicon (UX-002):** kök neden = `strokeWidth` (geçersiz yazım → beyaz halka
   hiç çizilmiyordu, eski dosyada 0 beyaz piksel) + siyah dolgu (koyu temada
   görünmez). Yeni: sabit mavi `#2563eb` dolgu + halka, `stroke-width="420"`,
   şeffaf zemin, tema varyantı yok. SVG×2 + 8 PNG + ICO yeniden üretildi
   (mürekkep %14.5 → %19.1); `layout.tsx` `?v=4` → `?v=5`. `theme-color` siyah
   bırakıldı (bilinçli). HTTP probe ile 9 link + doğru içerik + sha256 eşitliği.
   6 birim testi.
3. **Kart hizası (UX-003):** InfoRow 3 kolonlu grid + `min-h-[44px]` + `py-2`,
   değer `break-all` (truncate kalktı), e-posta `sm:col-span-2`, avatar
   `sm:items-start sm:gap-6`, kopyala `justify-self-end`, QR `p-3`.
   Canlı ölçüm 3 genişlikte: değerler aynı x (2 kolon / mobil 1), ikonlar aynı
   dikey çizgi, 44px satırlar, kesilen 0, QR merkez farkı 0 ve kenar boşlukları
   simetrik, avatar/başlık üst çizgisi eşit, yatay taşma yok. 4 birim testi.

**Kapılar:** tsc **0** · eslint `--max-warnings 0` (8 dosya) **0** · vitest
**637/637** (56 dosya) · playwright **62/62** · negatif kontrol **GEÇERLİ**
(3 mutasyon → 7 test kırıldı, byte-exact geri yükleme sha256 doğrulandı →
24/24 yeşil). Kırılan eski sözleşme (`vcard-qr-only.test.ts` InfoRow diliminde
`justify-between` yasak) yorum yeniden yazılarak düzeltildi.

## BEKLEYEN (kullanici eylemi)

- ~~`supabase/chat.sql` + `supabase/schema.sql` ALTER'leri SQL Editor'da calistirilmali.~~
  **TAMAM (2026-10-12):** SQL Editor'da calistirildi ("Success. No rows returned");
  sonda 4 tablo + 3 kolon 200. `/api/chat/v2` artik 503 vermiyor.
- **SQL Editor'de calistirilmasi gereken 2 migration (2026-10-13 olculdu):**
  `scripts/schema-languages.sql` (admin "Bildigim Diller" sekmesi bu yuzden
  "tablo yok" uyarisi veriyor) ve `scripts/schema-fixes.sql`
  (`messages.phone` kolonu: iletisim formu telefonu simdilik `body` icine
  yaziyor, veri kaybi YOK). Panel artik uyari metninde DOSYA ADINI gosterir.
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
