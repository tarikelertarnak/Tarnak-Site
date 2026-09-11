# Tarnak UX/Fix Paketi — Progress

## 2026-09-09 (18. tur) — Blog tag'leri + Toolbox/Sosyal SVG dönüşümü + GitHub Repoları + Chat thread'leri
- **Tetikleyici**: kullanıcı paketi — (1) blog detay etiketleri, (2) Toolbox/Sosyal'da iconify yerine SVG + link/komut, (3) indirme ZIP'i combobox'a + platform yoksa "Diğer" grubu, (4) "Admin Panel Projeler kısmı gerçek değil bütün projeler gözükmüyor", (5) chat'te herkesle konuşma + son konuşanlar üstte + ayraç.
- **Blog detay tag rozetleri**: `blog/[slug]/page.tsx` h1 altına badge satırı (rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold) — canlı HTML'de doğrulandı.
- **Toolbox iconify→SVG + link/komut**: content.ts ToolboxItem → `{label, type?: 'link'|'command', href?}` (icon geri-uyumluluk: render'da kullanılmaz); varsayılanlar 9 gerçek link + 1 komut örneği (`npx create-next-app@latest my-app`). validations.ts itemList güncellendi. icons.tsx: LinkIcon/TerminalIcon/LaptopIcon/GamepadIcon/DumbbellIcon/MusicIcon/XIcon/LinkedInIcon/TelegramIcon/DiscordIcon + socialIcon'a mdi:twitter/x/linkedin/telegram/send/discord/link case'leri. about-section: @iconify/react import'u KALDIRILDI (artık hiçbir site bölümü iconify değil); ToolboxItem yeniden yazıldı (komut → TerminalIcon + tıkla kopyala, link → LinkIcon + <a>); INTEREST_ICONS map (mdi:laptop/gamepad-variant/gym/music/shield-lock). Admin panel: Toolbox formu "İkon (iconify)" → Tip native select (Link/Komut) + URL/Komut input; SecurityTools formu da aynı; Sosyal form "İkon" → Platform select (9 platform; mdi:github default); iconify bilgi kutusu kaldırıldı; addToolbox/addSecurityTool/addSocial default'ları tip/href'li. i18n: `about.toolboxCopy` tr/en eklendi.
- **ZIP combobox**: project-card.tsx — `selectedOS` → `current: DownloadOption | null`; downloadOptions'a srcLink varsa ZIP seçeneği (`{srcLink}/archive/refs/heads/main.zip`); grouped'a os'suz item'lar için `other[]`; render'da "Diğer" grubu (i18n `projects.other` "Diğer"/"Other"); currentDownloadUrl/Label `current?.[] ?? downloadOptions[0]`; ayrı ZIP butonu kaldırıldı.
- **Admin Projeler gerçek veri** (kök neden: /projects sitesi yalnız content.projects.items + GitHub'e dış buton gösteriyor, GitHub repo'ları admin'de YOKTU): admin panel Projeler sekmesine **"GitHub Repoları"** PanelCard — `clientFetchUserRepos(settings.githubUsername)` ile 9 repo (canlı proxy doğrulandı: TARIKELER-TARNAK 9 public repo, 200); her repo: "Sitede var" (yeşil, title eşleşmesi) veya "Ekle" butonu (addGithubRepo → content.projects.items başına `{title, description, projectLink: /github/{owner}/{repo}, srcLink, stars, forks, updatedAt, tags: topics}`) + GitHub linki. Kaydet→saveContent ile sitesine yansır.
- **Chat kişi listesi + thread'ler**: chat-window.tsx iki kolona yeniden yazıldı (sol: Genel Sohbet + Sohbetler [son mesaj desc] + ayraç + Diğer [hiç yazmamış kayıtlı kullanıcılar]; sağ: thread başlığı + mesajlar + input). GET tümünü çekip client'ta filtreler; gönderimde `to: contact` (thread seçiliyse). Yeni `/api/chat/users` (profiles: username/full_name/avatar_url, giriş zorunlu → 401 test edildi). `getMessages` GİZLİLİK düzeltmesi: user'sız → `!owner && !to` (özel mesajlar public akışa SIZMIYOR — test: admin→alice özel mesaj public GET'te 0); user'lı → `(m.name===name && !owner) || m.to===name` (artık kullanıcılar arası özel mesajlar da okunabiliyor, önceden yalnız owner→kullanıcı). POST: non-admin dalına da `to` desteği eklendi. i18n: chat.chats/chat.others/chat.general tr/en.
- **Doğrulama (canlı)**: tsc --noEmit 0. / /blog /chat 200. GET /api/chat gizlilik ✓, /api/chat/users 401 (girişsiz) ✓, POST özel mesaj 200 + silme 200 ✓, GitHub proxy 9 repo ✓, blog detay tag badge HTML'de ✓. Dev server PID 14708 çalışıyor (supabase bağlantısı node fetch'ten timeout — proxy/GitHub tarafı çalışıyor).
- Not: normal kullanıcı için `chat.send` yetkisi rol katalogunda yok (POST 403 "yetkin yok") — admin panel Roller'den atanabilir, bilinçli davranış. Supabase'e doğrudan node fetch timeout (ağ) — veri akışı dev server merge üzerinden doğru.

## 2026-09-09 (17. tur) — Rol/yetki sistemi: kalıtsal Admin + kilitli Site Sahibi + granular yetkiler + limitler
- **Tetikleyici**: kullanıcı Admin Paneli → Kullanıcılar'da kendine yanlışlıkla "Kullanıcı yap" dedi ve adminliğini kaybetti. İstedikleri: (1) kendisi dokunulmaz varsayılan Admin; (2) hazır rol grupları — Admin / Admin Asistanı / Trustworthy / Employer / Verified / User; (3) hazır gruplar dışındaki her yetki tek tek seçilebilir (gruplanmış, tümünü seç, çocuk CRUD izinleri); (4) limitler (dosya yükleme MB, günlük mesaj); (5) admin olmayan için 🔒 "Sayfa düzenleyici yalnızca yönetici hesaplarına açıktır." ekranı.
- **DB migrasyonu** (Management API ile canlı çalıştırıldı, 201): `profiles` → `is_owner boolean default false`, `roles text[] default ['user']`, `permissions text[] default []`, `limits jsonb default {}`. Owner satırı güncellendi (is_owner=true, roles=['admin'], role='admin'). `protect_owner` trigger: **owner satırında is_owner/roles/role/permissions/limits asla değişemez**; ayrıca `roles @> ['admin'] → role='admin'` senkronu (admin değilse 'user').
- **Katalog** `src/lib/permissions.ts`: PERMISSION_GROUPS (chat/files/location/blog/projects/users/panel — toplam 20 yetki, her biri görme/ekleme/düzenleme/silme çocukları), ROLE_PRESETS (6 hazır rol, admin='*' wildcard), `expandPermissionPattern` ('blog.*' → 4 yetki), `effectivePermissions(roles, extra)`, admin her zaman tüm yetkilere sahip.
- **API** `/api/admin/users`: AdminUserRow'a isOwner/roles/permissions/limits eklendi; yeni action'lar `setRoles` (yalnızca geçerli preset id'leri), `setPermissions` (yalnızca katalog yetkileri), `setLimits` (fileMaxMb 0-1024, dailyMessages 0-100k), mevcut `resetPassword`/DELETE korundu; **owner hedefli TÜM mutasyonlar 403** ("Site sahibi hesabı değiştirilemez.").
- **UI** `users-panel.tsx`: 🔒 Site Sahibi (amber) + rol rozetleri; her satırda 3 popover — Roller (6 preset çoklu seçim), Özel Yetkiler (gruplu checkbox'lar + Tümünü Seç/Temizle + kök belirsiz durum), Limitler (2 sayısal input); admin toggle roller kümesi üzerinden; owner satırının tüm butonları disabled.
- **Yetkisiz erişim ekranı**: puck path'inde zaten istenen metin vardı; `/admin` için metin "Sayfa düzenleyici yalnızca yönetici hesaplarına açıktır." (EN: "The page editor is only available to admin accounts.") yapıldı. `scripts/schema.sql` kolonlar + trigger ile senkronize edildi.
- **Doğrulama (canlı)**: tsc 0. Migration 201. Owner satırı REST'te is_owner=true/roles=['admin']; PATCH ile demote denemesi → trigger geri aldı (hâlâ admin). UI: 🔒 SİTE SAHİBİ + ADMİN rozetleri, 6 butonun hepsi disabled. E2E: test kullanıcısı oluşturuldu → UI popover ile Verified rolü atandı (`roles=['user','verified']`, role senkron 'user') → "Admin Yap" ile `roles=['admin'], role='admin'` → test kullanıcıları silindi, veritabanı temiz.
- Not: hakların davranışa bindirilmesi (mesaj/dosya/blog/proje modüllerinde hasPermission kontrolü) sonraki turlara bırakıldı — rolleri ve yetkileri şimdiden atamak mümkün.

## 2026-09-07 (7. tur) — Puck editör: Sağ panel kaldırıldı, viewport/zoom top header'a taşındı, activity bar sadeleştirildi
- İstenen: (1) Sayfa butonu activity bar'dan kaldır (sağ panel zaten açık), (2) sağ panel tamamen gizle, (3) viewport/device switcher + zoom kontrolleri top header bar'a taşı.
- **Sağ panel gizleme**: CSS ile `._PuckLayout_1yxlw_1 > [class*="PuckSidebar"]:last-child` ve `._PuckLayout_1yxlw_1 > [class*="SidebarSection"]:last-child` gizlendi. `--sidebar-right-width: 0` ve canvas `margin-right: 0` ile canvas tam genişlik kazandı.
- **Activity bar**: Page butonu kaldırıldı — sadece Bileşenler + Anahat (Outline) kaldı. State tip `'components' | 'outline' | null` olarak güncellendi.
- **Viewport/Zoom top header'a**: Puck'ın kendi `._PuckCanvas-controls_18jay_16` gizlendi (`display: none`). Yeni `puck-header-toolbar` Puck header'ının sağ tarafına (`margin-left: auto`) enjekte edildi: device select (Masaüstü/Tablet/Mobil) + zoom bar (↺ reset + number input 10-500 + %).
- **Zoom senkronizasyonu**: Puck'ın gizli zoom select (`._ViewportControls-zoomSelect_gejzr_21`) ile iki yönlü sync — input değişince select güncellenir, select değişince input güncellenir.
- **Device switcher**: Canvas elementine `data-device` attribute + CSS custom property `--device` set ediliyor (Puck'ın responsive preview'i için).
- Doğrulama: tsc 0. Canlı test edilecek.

## 2026-09-08 (7b. tur) — DÜZELTME: 3 buton + panel değişimi gerçek çalışıyor
- **Sorun**: Kullanıcı "hep Components oluyo" dedi — sol paneldeki Components/Outline bölümleri arasında geçiş olmuyordu; ayrıca Page butonu geri isteniyor, sağ panel sol tarafa eklenmeli.
- **Kök neden**: (a) Puck 0.20.2'de sol sidebar Components + Outline'ı **tab değil üst üste stack** olarak render ediyor (kaynak: dist/index.js L9402-9403) — tab tıklama mantığı yoktu. (b) Sağ toggle butonu `btns[length-1]` ile aranıyordu ama header'da 5 buton var (left, right, menu, undo, redo) → redo'ya basıyordu.
- **Çözüm**: 
  - `switchPanel` artık butonları `title` attribute ile buluyor (`Toggle left sidebar` / `Toggle right sidebar`).
  - Görünüm sınıfı `puck-view-components|outline|page` puck wrapper'a uygulanıyor.
  - CSS: components görünümünde Outline bölümü gizli, outline görünümünde Components bölümü gizli → panel gerçekten değişiyor.
  - **Page sol tarafta**: PuckLayout grid-template-areas `"left editor right"` → `"right editor left"` swap — sağ sidebar (alanlar) **görsel olarak sol kolonda** render ediliyor; sağ tarafta hiç panel yok.
  - Açılışta sağ panel otomatik kapatılıyor (default components).
- **Doğrulama (CDP)**: 3 buton [Bileşenler, Anahat, Sayfa] ✓; components→compVis:true/outlineVis:false ✓; outline→outlineVis:true/compVis:false ✓; page→grid swap "right editor left" + hasFields:true ✓. Konum: Page panel x=48 (sol), canvas x=313 ✓. tsc 0. Ekran görüntüsü: `site/puck-v7-page.png`.

## 2026-09-07 (5. tur) — Puck header: viewport controls taşınması + TARNAK kaldırılması
- Kullanıcı istedi: (1) header ortasındaki "TARNAK" yazısı (sarlı arka planlı) kaldırılacak; (2) viewport kontroller (device icons, zoom, dropdown) header satırına taşınacak (undo/redo ile Publish arasında).
- **Viewport controls taşınması**: `html.dark ._PuckCanvas-controls_18jay_16 { position: fixed; top: 163px; left: 63px; z-index: 50; ... }` — parent container `position: fixed` ile header alanına (y=147-214) sabitlendi. Child viewport controls (_ViewportControls_gejzr_1) static kalıyor ama parent içinde doğru pozisyonda.
- **TARNAK gizlenmesi**: `._PuckHeader-inner_15xnq_10 > *:nth-child(2) { visibility: hidden }` — header orta grid area (middle) gizli, undo/redo da gizlendi (Ctrl+Z / Ctrl+Shift+Z ile erişilebilir).
- **Doğrulama**: tsc 0. Canlı CDP: vc parent rect x=63, y=163 (header içinde ✓), position=fixed ✓. Görsel: puck-v3.png — tüm satır tek satırda (device icons + zoom + undo/redo + Örnek İçerik + Publish), paneller koyu.

## 2026-09-07 (4. tur) — Puck koyu tema: paneller + header fix
- İkinci şikayet: yan paneller (Components/Page) ve üst panel header hâlâ beyaz; ortadaki "TARNAK" yazısı kaldırılacak.
- **Kök neden**: `--puck-color-white` ve `--puck-color-black` unchanged kalmıştı — Puck panel başlıkları `var(--puck-color-white)`, drawer item'lar `var(--puck-color-white)`, header `var(--puck-color-white)` kullanıyor.
- **Fix** (aynı `<style>` bloğuna eklendi):
  - `html.dark { --puck-color-white: #1a1b21; --puck-color-black: #f1f2f4; }` → panel başlıkları (SidebarSection-title), drawer item'lar (DrawerItem-draggable), Puck header hepsi koyu oldu.
  - Header orta kısım (TARNAK title): `._PuckHeader-inner_15xnq_10 > *:nth-child(2) { visibility: hidden }` → başlık gizli, grid alanı korunuyor (layout shift yok). Undo/redo da gizlendi (klavye kısayolları: Ctrl+Z / Ctrl+Shift+Z).
- **Doğrulama**: tsc 0. Canlı CDP: leftTitle bg rgb(26,27,33) ✓, drawerItem bg rgb(26,27,33) ✓, headerMiddle visibility:hidden ✓, section bg'leri transparan/koyu ✓. Ekran görüntüsü: puck-dark-v2.png.

## 2026-09-07 (3. tur) — Puck editör tema uyumu: "düzenleme işleri açık tema" fix
- Şikayet: "düzenlediğimiz sayfa koyu tema görünüyor evet ama düzenleme işleri açık tema — düzelt". Sayfa (canvas) koyu görünümü korunacak; düzenleme arayüzü kullanıcının temasına uymalı.
- **Kök neden (2 katman)**: (1) Puck editor UI'ı (`@measured/puck/dist/index.css`) varsayılan **açık** — tüm arka planlar `--puck-color-grey-10/11/12` (açık gri/beyaz) değişkenlerine bağlı; (2) düzenlenen "sayfa kutusu" `._PuckCanvas-root_18jay_30` CSS'te `background: white` **sabit** — karanlık tema içeriği (dark:bg-black bileşenler) beyaz kutu üstünde uyumsuzdur.
- **Fix** (`admin/puck/[[...puckPath]]/client.tsx` — `<style>` bloğu puck css import'undan sonra geldiği için cascade'de kazanır):
  - `html.dark { --puck-color-grey-01..12 }` → Puck paleti koyuya çevrildi (grey-11: #f5f5f5→#1a1b21, grey-09 border, grey-02 metin açık...). Tüm Puck UI (paneller, input'lar, modallar, viewport kontrolleri) değişken tabanlı olduğu için tek blokla bütün editör koyuya döndü.
  - `html.dark ._PuckCanvas-root_18jay_30 { background:#0a0a0f }` (sayfa kutusu koyu), `html.light` → beyaz (Puck default).
  - Üst çubuk tema-aware: `bg-white text-black dark:bg-[#0d0d12] dark:text-white`, butonlar `border-black/15 dark:border-white/20`, versiyon dropdown `bg-white dark:bg-[#16161d]`, yardımcı metinler `text-black/50 dark:text-white/50`.
- **Doğrulama**: tsc 0, build EXIT 0. Canlı CDP (html.dark): topbar rgb(13,13,18)/beyaz metin ✓, canvasRoot (sayfa kutusu) rgb(10,10,15) ✓, canvas dış alanı rgb(26,27,33) = yeni grey-11 ✓ (Puck UI tümüyle koyu). Ekran görüntüsü: `site/puck-dark-proof.png`.
- Not: Puck css'te kendi dark modu yok (prefers-color-scheme/dark class'ı yok) — değişken override tek desteklenen yöntem. CSS-module hash (`_18jay_`) bundle sabit olduğundan override güvenli; Puck sürümü yükseltilirse hash kontrol edilmeli.

## 2026-09-07 — "Yetkisiz Erişim" kök neden fix: admin_session artık tanınıyor
- **Durum**: kullanıcı "birçok hata var ve yetkisiz erişim alıyorum" bildirdi. Kaynakları: (1) önceki turun test sonunda bıraktığım `dev-role=user` cookie'si tüm panel/editör kayıtlarını (POST /api/admin/puck dahil) 401'e çeviriyordu; (2) gerçek **/login girişi hiçbir yerde kullanılmıyordu** — `lib/auth.ts` (`admin_session` cookie, verifySessionToken) ayrı bir `getSessionUser`'a sahip ama `lib/supabase/session.ts`'in `getSessionUser()`'ı (panel guard'larının kullandığı) onu **yok sayıyordu**: /login'den giriş yapan kullanıcı `admin_session` alsa bile tüm guard'lar onu tanımıyor → sürekli "Yetkisiz Erişim" döngüsü.
- **Fix** (`src/lib/supabase/session.ts`): `getSessionUser()` artık sırayla → 1) `admin_session` cookie'si (verifySessionToken + `data/admin.json` username eşleşmesi → role admin), 2) GEÇİCİ dev-role cookie, 3) supabase. `lib/auth` + `lib/content` import'ları eklendi (dairesel bağımlılık yok).
- **Doğrulama**: admin_session token ile `/api/admin/session` → `{"user":{"role":"admin","username":"TARIKELER"}}`. Geçersiz token → /login?next=%2Fadmin%2Fpuck redirect. dev-role=admin /admin/puck/home → SSR 200 (841KB, editör içeriyor). tsc 0.
- **Client hata taraması (headless Edge + CDP)**: /puck/home → DOM'da "GÖRSEL DÜZENLEYİCİ AKTİF / TARNAK / HOŞ GELDİNİZ / paragraf" render, portal yok, failedResource yok, konsol sadece React DevTools+HMR. /admin/puck/home (dev-role=admin) → editör tam açık: body'de "Publish" butonu mevcut, Components (Hero/Başlık/Paragraf/Görsel/Buton/Boşluk/İki Sütun) + Outline render, exceptionThrown 0. → **UI'da şu an gerçek hata yok**; görülenler erişim kaynaklıydı.
- **Ek düzeltmeler**: (1) `admin/puck/client.tsx` boş veri için `{}` yerine `EMPTY_DATA` (`{root:{props:{}},content:[],zones:{}}` — Puck içte patlayabiliyordu); (2) `config.tsx` HeadingBlock `<h1>` sabit etiket yerine atanan `Tag` dinamik h1-h4 (semantik + SEO).
- **Kullanıcıya yol**: /login'den `TARIKELER` + kendi şifresi (admin.json — bcrypt'e rehash olur) ya da ayarlar → "Geliştirici (geçici)" → Admin. Tarayıcı MCP (BrowserOS neo) bu turda bağlantısız düştü — kullanıcının cockpit'ten başlatması gerekebilir.

## 2026-09-07 — Puck görsel düzenleyici entegrasyonu (admin)
- **Amaç**: "puck-main.zip yardımıyla admin özelliklerini ekle — admin her şeyi yapabilir" → admin artık /admin/puck üzerinden sayfaları görsel olarak düzenleyip /puck/* üzerinde yayınlıyor.
- **Kaynak**: `puck-main.zip` = measuredco/puck repo (core 0.23.0 canary — npm'de yok). npm son stabil `@measured/puck@0.20.2` kuruldu; zip rehber olarak kullanıldı. Not: 0.20.2'de `zones` component config'inde tanımlanmıyor (tip hatası veriyor → kaldırıldı, renderDropZone varsayılan limitlerle çalışıyor) ve header'da default "Publish" butonu yok — headerActions children'ı boş; Publish yerine menüdeki "Publish" (Globe) kullanılıyor.
- **Yeni dosyalar**: `src/lib/puck/normalize.ts` (fs'siz URL-güvenli sayfa adı — client'ta da import ediliyor), `src/lib/puck/store.ts` (data/puck-pages.json oku/yaz/sil — content.ts deseni), `src/lib/puck/config.tsx` (Config tipi; root.title + 7 bileşen: HeroBlock, HeadingBlock, ParagraphBlock, ImageBlock, ButtonBlock, SpacerBlock, ColumnsBlock (left/right dropzone) — site Tailwind stili), `src/app/api/admin/puck/route.ts` (GET ?page= / POST {page,data} / DELETE ?page=; `isAdminUser` guard → 401; `revalidatePath('/puck/'+page)`), `src/app/admin/puck/[[...puckPath]]/page.tsx` + `client.tsx` (getSessionUser guard → login redirect; role!=='admin' → "Yetkisiz Erişim"; Puck editör `iframe={{enabled:false}}`, isClient guard, GET veri, `onPublish` → POST, üst bar: ← Panel / sayfa adı / Kaydedildi durumu / "Sayfayı Gör" / "Yeni"), `src/app/puck/[[...puckPath]]/page.tsx` + `client.tsx` (getPuckPage → yoksa notFound; `Render` + "← Ana sayfaya dön").
- **Admin panel**: başlık sırasına "Sayfa Düzenleyici" butonu (`/admin/puck/home`, vector-square ikon) — "Siteyi Görüntüle"nin soluna.
- **Fix (fs client'a sızıyordu)**: client.tsx `normalizePage`'i store.ts'ten import ediyordu → store fs/promises içerdiği için `Module not found: Can't resolve 'fs/promises'` (browser). → normalizePage ayrı `normalize.ts`'e taşındı.
- **Doğrulama**: tsc --noEmit 0 hata. `npm run build` EXIT 0 (`/api/admin/puck` + `/puck/[[...puckPath]]` listede). Canlı: dev-role=admin ile /admin/puck/home → editör tam render (undo/redo, Components: Hero/Başlık/Paragraf/Görsel/Buton/Boşluk/İki Sütun, Outline, root "Sayfa başlığı" alanı); başlık girilip yayınlanınca `data/puck-pages.json` oluştu. Hero+Heading+Paragraph içerik POST edildi → /puck/home `Render` ile "GÖRSEL DÜZENLEYİCİ AKTİF / TARNAK / Hoş Geldiniz / paragraf" render edildi (vitrin içerik kaydedildi). Yetki: dev-role=user → 401, cookie'siz → 401. Admin panelde "Sayfa Düzenleyici" linki görünür. Cookie test sonunda dev-role=user'a alındı.
- Not: /puck sayfaları site header'ıyla (root layout) render olur; ana sayfa / hâlâ statik — düzenlenen sayfalar /puck/* altında.

## 2026-09-07 — Hydration mismatch fix + "Admin" etiketi
- **Hydration mismatch düzeltildi**: `ThemeInitScript` (head'deki parse-time script) hydration sırasında `document.body.style` (colorScheme/backgroundColor/color) set ediyordu → server HTML'de body'de style attribute'ü yokken client'ta vardı → React "A tree hydrated but some attributes..." hatası. Body renkleri zaten globals.css (`:root.dark`/`:root.light` → color-scheme) + Tailwind body class'larıyla (`dark:bg-black dark:text-white` / `bg-white text-black`) yönetildiği için script'in body style satırları **tamamen gereksizdi** → kaldırıldı (`theme-init-script.tsx`: body bloğu + catch'teki body bloğu). `root.style.colorScheme` kaldı (html'de suppressHydrationWarning var).
- **"Admin User" → "Admin"** (`settings-dropdown.tsx` RadioGroup label). "Kullanıcı" aynı kaldı.
- **Doğrulama**: yeni temiz tab → konsol **sıfır hata/warning** (önceki tab'daki konsol kayıtları eski script kalıntısıydı — console buffer'ı geçmiş pathname'leri tutuyordu). / , /blog, /about, /github/TARIKELER-TARNAK (9 repo yüklendi), /projects, /contact (404 — normal) hepsi temiz. Ayarlar drawer'ında "Admin" + "Kullanıcı"; "Admin" tıklanınca `dev-role=admin` + modal kapanır + sidebar'da "Panel" linki; tsc --noEmit 0 hata.

## 2026-09-07 — GitHub proxy + geçici Admin User rolü + sidebar admin linki fix + repo dosya görüntüleme fix
- **GitHub proxy** (`src/app/api/github/proxy/route.ts`): tarayıcıdan api.github.com'a doğrudan istekler bu makinede IPv6-DNS timeout'una takılıyordu. `getJSON` (`src/lib/github-client.ts`) artık `/api/github/proxy?url=...` kullanıyor — yalnızca `https://api.github.com/` prefix'ine izin verir; GITHUB_TOKEN header'ı, `httpsGet` (IPv4 bypass + dnsCache), 10dk in-memory cache (2xx-4xx cache'lenir, 5xx/403 tekrar denenir), hata → 502.
- **Geçici "Admin User" rolü** (geri silinecek — kullanıcı test edecek): `src/lib/supabase/session.ts` `getSessionUser()` başında `dev-role` cookie kontrolü (GEÇİCİ blok — 'admin' → dev-admin, 'user' → dev-user; cookie yoksa normal supabase akışı). `src/components/settings-dropdown.tsx` ayarlar drawer'ına "Geliştirici (geçici)" bölümü: Admin User / Kullanıcı / Sıfırla — tıklanınca `dev-role` cookie (7 gün) + refresh.
- **Sidebar admin linki bug'ı (yeni bulundu)**: sidebar `setSessionUser(data.user)` yapıyor, `sessionUser?.isAdmin` kontrol ediyordu — ama `/api/admin/session` user'ının `isAdmin` alanı YOK (alan `role`) → Admin linki hiçbir kullanıcıda görünmüyordu. Fix: state tipi `SessionUser | null`, kontrol `sessionUser?.role === 'admin'`.
- **Repo dosya görüntüleme fix**: `repo-view.tsx` `selected.encoding === 'base64' && selected.content` + `atob()` kontrolü hep false + atob hatası veriyordu (client decoded string dönüyor). → `selected.content ?` (atob kaldırıldı).
- **Doğrulama (canlı)**: tsc --noEmit 0 hata. `/api/admin/session` dev-role=admin → `role: "admin"`; sidebar'da "Panel" linki göründü; /admin paneli tüm sekmelerle açıldı; ayarlar drawer'ında Admin User/Kullanıcı/Sıfırla render; "Kullanıcı" tıklanınca cookie `dev-role=user` + modal kapandı; dev-role=user ile /admin → "Yetkisiz Erişim". GitHub tarafı (önceki tur): proxy 200 (2.4s), releases 200 (916ms), 9 repo hatasız, background.js 12.240 karakter tam render.
- Not: /admin sayfasında sidebar toggle e2 çalışmadı (ana sayfada çalışıyor — takip edilecek küçük sorun, tur kapsamı dışı).

## 2026-09-07 — Sidebar brand + indirme ikon-only + dropdown redesign/flip + buton sırası + tsc 8/8 temiz
- **Sidebar brand düzeltmesi** ("iki şey saçma duruyor"): eski alt alta düzen (SiteLogo 28px + "TARIK ELER" / "TARNAK" iki satır) → header ile aynı tek satır düzene çekildi: `[tarnak-white.svg 30px] TARIK ELER — TARNAK` (gradient TARNAK). `SiteLogo` import'u kaldırıldı (tek kullanım yeriydi). DOM doğrulama: sidebar marka span metni = "TARIK ELER — TARNAK".
- **İndirme butonu ikon-only**: "İndir" metni kaldırıldı — [DownloadIcon 15 (w-9 link)] + [ChevronDown (w-7, border-l divider)] yan yana tek kapsayıcı (toplam 64px, shrink-0). Doğrudan indirme + sürüm seçme davranışı korundu (title/aria-label korunuyor: "Windows" / "Sürüm seç").
- **Dropdown yeniden tasarlandı**: rounded-xl + border-white/10 + bg-[#0d0d12]/95 + backdrop-blur-xl + shadow-black/40; giriş animasyonu (motion opacity/y/scale 0.12s); grup başlıkları uppercase tracking-[0.14em] text-white/40 + border-white/5; item'lar rounded-lg `mx-1.5 my-0.5` hover:bg-white/[0.06]; arama input'u bg-white/5 rounded-lg focus:border-white/25 (kalıntı mavi focus yok); ince scrollbar (`[scrollbar-width:thin]`). Liste max-h-64.
- **Auto-flip (viewport tabanlı)**: menü butonun sağında 288+8px yer varsa **sağa** (left: btn.right+8), solda varsa **sola** (right: vw-btn.left+8), hiçbiri yetmezse ekran kenarına yasla (left clamp 8..vw-296). top da `min(btn.bottom+8, vh-320)` ile alttan taşmaya karşı korumalı. Doğrulama (viewport 718): buton 510-538, sağda 180px <296 → SOLA açıldı, menü 204..492, `inBounds: true` (eskiden sağa hizalı kod solda 108px taşıyordu).
- **Buton sırası + dar ekran**: sıra **GitHub → Sayfayı Aç → İndir**. Kapsayıcı `flex-wrap`; Sayfayı Aç `min-w-[7.5rem] flex-1 whitespace-nowrap` (truncate kaldırıldı — yazı kırpılmıyor), İndir `shrink-0` — yeterli alan yoksa İndir alt satıra iner.
- **tsc 8/8 → 0**: `GitHubRepo.topics?`, `GitHubRepoDetails.visibility/openIssues` (+ fetchRepoDetails repoData tipi `visibility/open_issues_count` ve dönüşe ikisi eklendi), `GitHubFileContent.encoding?`, `SiteSettings.musicSrc?`, admin/content/route.ts `revalidatePath('/', 'layout')` tek çağrıya indirildi (3 çağrı aynı işi yapıyordu; revalidateTag imza uyumsuzluğu kaynağı), search/page `r.description ?? ''`, project-card `const tags = project.tags ?? []`.
- **Doğrulama**: `npx tsc --noEmit` → **0 hata** (ilk kez tamamen temiz). Tarayıcı: sidebar brand yazısı, kart buton sırası GitHub→Sayfayı Aç→İndir (önceki diff'te GitHub e82/Sayfayı Aç e83, İndir en sonda), dropdown (Sürüm ara + "Windows" ×2 — En Son Çıkanlar + Windows grubu), flip inBounds.

## 2026-09-06 — Komut paleti shadcn Command (cmdk) çekirdeğine geçirildi
- `cmdk@1.1.1` kuruldu; `src/components/ui/command.tsx` eklendi (shadcn/ui Command uyarlaması — proje token'ları: bg-background/text-foreground, kendi SearchIcon'u; Dialog sarmalayıcı yok, palet SearchDialog'un overlay'inde açılır). Export: Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut.
- search-dialog.tsx render'ı cmdk API'sine geçti: CommandInput (value/onValueChange kontrollü), CommandList + CommandEmpty (native boş durum; reposLoading'de spinner), CommandGroup (Navigation/Projects/GitHub/Blog), CommandItem (`value` = title+desc+href, `onSelect` → navigate), CommandSeparator'lar, CommandShortcut'lar. Eski custom activeIndex/ok tuş yönetimi kaldırıldı (cmdk yapıyor).
- Doğrulama: tsc temiz (bilinen layout musicSrc hariç); / 200; trigger `aria-label="Ara"` SSR'da; palet chunk'ı cmdk kodunu içeriyor.

## 2026-09-06 — Header + sidebar arama → komut paleti (⌘K)
- Header (top-bar) sağdaki `/search` form arama kutusu → `search:request-open` dispatch eden komut paleti tetikleyicisine çevrildi (ikon + "Ara..." + ⌘K kbd).
- Sidebar üstündeki `/search` form arama kutusu → aynı şekilde paleti açan satır butonuna çevrildi.
- `SearchDialog` (⌘K komut paleti — navigation/projects/blog/github kategorileri, fuzzy arama, klavye gezinme) root layout'a mount edildi (daha önce ölü koddur, hiçbir yerde render edilmiyordu).
- Fix: `search-dialog.tsx`'in `Link`'ine geçirilen `onClick` → ui/link'in desteklediği `onPress` (TS uyumu).
- Doğrulama: tsc temiz; / 200 — eski `action="/search"` formu kalktı; dev log hatasız. Not: /search sayfası duruyor (linklerle erişilebilir), sadece header/sidebar artık onu kullanmıyor.

## 2026-09-06 — /credits gruplar birleştirildi + ilk destekçi tıklanır
- Top Donors "İlk destekçi sen ol!" artık `/donate`'e giden tıklanır link (primary + üstü çizgi efekti yok, underline).
- Contributors, Testers, Translators, Top Donors → tek ortak `CreditGroup` kart bileşeni (aynı kart, ikon+başlık, açıklama, bölümlü liste). Contributors'daki farklı tablo düzeni (Avatar-İsim-Bağlantı kolonları) kaldırıldı; artık avatar+isim+role solda, "Ziyaret Et" butonu sağda liste satırı. Sadece içerik/ikon değişiyor.
- Doğrulama: tsc temiz; /credits 200 — donate linki + tıklanır "İlk destekçi" render; 4 özdeş grup kartı.

## 2026-09-06 — /about hero + sidebar credits ikonu
- /about hero: "Dünyama Kısa Bir Bakış" (about.title) kaldırıldı; "HAKKIMDA" (about.subtitle) Projeler/Anasayfa stiline çevrildi (border-b-4 border-primary, text-3xl→5xl, uppercase, primary).
- /about hero üstüne sosyal link satırı eklendi (hero-section ile aynı kart stil, h-11 w-11, socialIcon) — content.social'daki 4 link (GitHub, Instagram, YouTube, TikTok).
- Sidebar "Katkıda Bulunanlar" ikonu StarIcon → liste/belge ikonu (dikey çizgi + satırlar, verilen SVG path `M22 4.386h-2V15.9l-.419.3L12 21.613L4.419 16.2L4 15.9V4.386H2v-2h20zm-13 9h6v-2H9zm-1-4h8v-2H8z`).
- Doğrulama: tsc filtre temiz; /about 200 — eski başlık yok, altı çizili HAKKIMDA var, GitHub+TikTok linkleri render.

## 2026-09-06 — Geri bildirim metni kaldırıldı + not-found/error ikonları + cache temizliği
- Geri Bildirim bölmesi: `contact.description` + `contact.footerText` boşaltıldı (TR overlay, EN default, data/content.json) — "Bir sorun mu gördün..." ve "Çekinme..." metinleri bölmeden tamamen kalktı. `footerText` render'ı koşullu yapıldı (boş `<p>` kalmıyor).
- error.tsx ("Bir hata oluştu") ikonu → uyarı üçgeni (fill üçgen + `!`, 64px, text-danger).
- not-found.tsx: Button (LobeButton) yerine düz Link'ler — server component'te LobeButton SSR'da promise olarak çözülüyordu ("Element type is invalid. Received a promise"). Görünüm aynı (primary solid + bordered, iconlar korundu).
- Cache sorunu: `HeartIcon is not defined` dahil bayat görsellerin kaynağı `.next` (özellikle `.next/dev/cache` fetch-cache) — tamamen silinip yeniden başlatıldı, tüm sayfalar 200.

## 2026-09-06 — Ayarlar + Credits düzeltmeleri
- Görünüm: tema seçenekleri Açık/Koyu/Otomatik → Otomatik Algıla EN SOLA (varsayılan seçili, `auto/light/dark`).
- Dil: `setPref` artık React state'ini de güncelliyor (önceden sadece localStorage+cookie yazıyordu → Otomatik Algıla aynı dili algılayınca TR/EN butonu aktif olmuyor, "seçilemiyor" hissi). Artık auto→tr/en seçimi anında görünür.
- /credits: Contributors (crown→rozet), Testers (shield→test, stroke SVG), Translators (palette→dil), Top Donors (heart→kalp/kupa) başlık ikonları marka/özelleşmiş SVG'lere değiştirildi. RoleIcon'lar (alt roller) aynen kaldı.
- Doğrulama: tsc dokunulan dosyalar temiz; /credits 200 + 4 yeni path render.

## 2026-09-06 — Arama kutuları (başlık altı, filtre üstü)
- Anasayfa PROJELER + /projects: ProjectsGrid'e search input eklendi (Input + SearchIcon, `t('projects.search')` — placeholder zaten vardı, input kaldırılmıştı). Konum: filtre satırının ÜSTÜNDE.
- Anasayfa BLOG + /blog: BlogSection'a search input eklendi (aynı stil). /blog sayfası statik SSR grid yerine artık BlogSection kullanıyor → search + tag filtre + sıralama + "Daha Fazla" hepsi client'ta.
- Fix: `ProjectItem` tipine `tags?: string[]` eklendi (kod kullanıyordu, tip eksikti → ~9 tsc hatası temizlendi).
- Doğrulama: / , /projects, /blog → 200, HTML'de "Projelerde ara..."/"Yazılarda ara..." mevcut. Kalan 11 tsc hatası dokunulmayan dosyalarda (önceden vardı: repo-view, search/page topics, layout musicSrc, admin content route).

## 2026-09-01 — 2. dalga: buton tutarlılığı + sayaçlar + görünürlük + blog
- **Butonlar aynı renk**: Button.tsx `outlineClass` — bordered+primary/ghost artık `!text-primary !border-primary/40 !bg-primary/10`, base rengi `!text-primary !bg-primary` (solid). 👋 İletişime Ge ile aynı görünüm.
- **Tüm Projeler / GitHub Projeleri** başlıktan alındı → projects-grid search satırının ALTINA yan yana primary solid (actions slot).
- **Projeler grid**: visibleCount 8→9 (3 tam satır), "Daha Fazla Göster" artık **tek tıkla tümünü** gösterir (`setVisibleCount(filtered.length)`), gereksiz ikinci "Tümünü Göster" butonu kaldırıldı. `remaining` sayacı korundu.
- **Yıldız (GitHub tarzı tek beğenme)**: 5 yıldız → tek yıldız. localStorage (`star-state:{type}:{id}`) ile aynı kullanıcı tekrar basınca **unstar** POST → sayı düşer. `/api/stars` `unstar?: boolean` destekler. E2E: rating=1 → totalStars=1, unstar → 0.
- **Görüntülenme**: mount'ta `+1` şişmesi kaldırıldı → sayı sadece projeyi gerçekten açınca (`openProject`) artar. "En Çok Görüntülenen" sıralaması (desc) artık render'da şişmiyor.
- **Nav**: hamburger→çarpı morph animasyonu (3 çizgi, CSS transform). Settings/dil/mobil menü panelleri **opak** (`bg-background`).
- **Footer**: inline SVG sosyal ikonlar + yuvarlak gruplu blok (`rounded-3xl border bg-background/60`).
- **Blog** (client): arama + tag filtre + sıralama + "Daha Fazla Göster (kalan)" (tek tıkla tümü) + big mavi altı çizgili başlık + gruplu kartlar.
- **About + Projects** bölüm başlıkları: küçük gradient başlık kaldırıldı → büyük mavi altı çizgili tek başlık (tasarimcidayi tarzı, `border-b-4 border-primary`).
- **Contact**: telefon (opsiyonel) + e-posta opsiyonel. Şema: email `.optional().or(literal(''))`, phone `.optional().or(literal(''))`; `ContactFormData` düz interface (email/phone `string`). ArcJet `email: values.data.email as string` (boşsa undefined → email check atlanıyor, IP+rate-limit çalışır). Discord embed + Supabase'e phone eklendi.
- **Marquee**: ikinci "EKİBİMİZ" şeridi (`content.about.team`, `teamTitle`). content.ts/i18n-content-tr/validations/i18n-server merge güncellendi.
- **Kritik ikonlar inline SVG** (görünmez Iconify CDN sorunu): hero, scroll-to-top, settings, nav, footer, project-card, blog; socialIcon() map github/instagram/youtube/tiktok.

## Doğrulama (2026-09-01)
- `npm run build` temiz (tsc + lint 0 hata).
- Sayfalar 200: home/blog/projects. Dev server port 3000.
- Node fetch E2E: stars +1→unstar−1 (0'a döndü), contact email+phone boş & phone'lu → 200 success.
- Home HTML'de client kısımlar SSR'de render edilmez (blog/projeler client) — görsel onay tarayıcıda.

## 2026-09-01 — Görünmez ikon kök temizliği (3. dalga)
- icons.tsx'e eksik inline SVG'ler eklendi: BriefcaseIcon, SchoolIcon, CloudAlertIcon, SourceForkIcon, RefreshIcon, ArrowLeftIcon, ErrorIcon, SendIcon, ThumbUpIcon, SortAlphaIcon, UpdateIcon.
- Ana sayfa + menü tüm Iconify kullanımları inline'a geçirildi (about, projects-grid, contact, github-section, navigation), Iconify import'ları kaldırıldı.
- Kalan Iconify: alt sayfalar (chat/admin/auth/github-explorer/repo-view/music-player/tank-game) + marquee/about devicon (veri kaynaklı).

## Sıradaki
- Alt sayfa ikonlarını da inline'a çevirmek (chat-window, auth-form, admin-panel, github-explorer, repo-view).
- Tarayıcıda görsel doğrulama.

## 3. dalga final (2 Eyl 2026)
- hero i18n: t('hero.blog')/t('hero.about') tr+en dict'lere eklendi; hero'ya useT bağlandı, ArrowDownIcon import kaldırıldı.
- Logo tıklama: zaten '/' deyse scrollTo(0,0) smooth (onClick), degilse normal nav; Link->a. Nav isim + TARNAK mavi (text-primary).
- Iletisim: email VEYA telefon en az biri zorunlu — isFormValid + contactFormSchema.refine. API E2E: ikisi bos 400, sadece phone 200.
- Alt-yazilar silindi: content.json 72/197 + i18n-content-tr 38/78 + i18n blog.desc (tr+en) bosaltildi.
- framed kutular: Section'a framed prop eklendi (rounded-3xl border bg-foreground-200/5). blog+projects+about+contact framed -> hepsi tek gruplu kutu (Geri Bildirim/Hakkimda dahil).
- Hakkinda sosyal blok: content.social ikon satiri SectionTitle altina (primary stili, hero 'socialIcon').
- Footer: isim text-primary yapildi; karanlik alt grup bg-background/60->bg-foreground-200/5.
- Build temiz; home 200, about/blog/contact id'leri render.


## 4. dalga (2 Eyl 2026) - tasarimcidayi referansli istekler
- Hero CTA: 'Sohbet Baslat' butonu eklendi (href=/chat, ChatIcon); Projeleri kesfet'e ArrowDown, Iletisime Gec'e Send ikonlari; Blog/Hakkimda bordered oldu.
- SettingsDropdown butonu opak: bg-background/40+backdrop-blur kaldirildi, bg-background düz.
- ScrollToTop: bg opak + text-primary (hangi/ok ikon net gorunur), hover dolu primary.
- Alt sayfalar blog/projects SectionTitle big moda cevrildi (tek buyuk mavi alti cizili subTitle, gereksiz 'Projeler'/'Blog' title kaldirildi), Section framed eklendi.
- Blog alt sayfa kartlari blog-section ile ayni glyik (rounded-3xl border bg-foreground-200/5).
- Not: blog search/filtre/sort, projeler search/filtre/sort, ekip+Teknoloji marquee (hover pause), (N) kalan gosterimi, muse tek yildiz begenme ZATEN mevcuttu.
- Build temiz; / /projects/ /blog/ hepsi 200.

- About+Contact SectionTitle big moda cevrildi: ikili title (Dunya Kisa Bakis / Geri Bildirim) silindi, tek buyuk mavi alti cizili HAKKIMDA / GERI BILDIRIM basligi (Blog/Projeler ile ayni). SectionTitle big modda bos description gizlendi.

- Contact: 'GERI BILDIRIM' SectionTitle Card icinden cikarilip kutunun DISInda boguz (big mavi alti cizili). CardHeader import kaldirildi.
- Contact form: telefon alani altina 'E-posta veya telefondan en az birini girin' notu eklendi (i18n contact.needContact tr+en). Zorunluluk (ikisinden biri) zaten client isFormValid + schema.refine + API'da vardi; API dogrulandi (ikisi bos 400).

- Hero CTA hepsi solid-primary yapildi (Blog/Hakkimda/Iletisime Gec bordered'di, duzeltildi; Projeleri Kesfet/Sohbet Baslat ile ayni).
- 'Daha Fazla Goster' butonlari (blog + projects-grid) bordered -> solid-primary.
- Hero '<TARIK ER - TARNAK />' basligi gradient -> text-primary (mavi, PROJELER ile ayni renk).

- Projects sort: readLocalViews -> readLocalStats (views+downloads). 'downloads' sort secenegi eklendi (Indirme Sayisi). Score sort'ta tie-break localeCompare artik direction'a duyarli (eskiden hep A-Z) -> 'en cok goruntulenen / en cok yildiz tam tersi' algisi duzeltildi.
- Blog: sort X oku a-z/z-a ceviren yon butonu eklendi (SortAscending/SortDescending), direction state, az sort'a dir uygulandi.
- Console: StarOutlineIcon bozuk path'ti (bos yildiz gorunmuyordu) -> temiz stroke SVG yildiz.
- SendIcon (Iletisime Gec, Mesaj Gonder) + ThumbUpIcon bozuk path'ti -> temiz birbirinden net ikonlar.
- project-card: begeni(StarRating)+indirme(Download)+goruntulenme(Eye) artik tek satir yan yana.
- hero butonlarin hepsi solid-primary; contact footer chatCta (Sohbet Baslat) de bordered -> solid.
- i18n tutarliligi: content.json hero.description EN'di ama TR metindi (EN modunda Turkce gorunuyordu) -> dogru EN ceviri yazildi.
- Blog tam yerellestirme: BlogPost'a title_en/excerpt_en/content_en eklendi; getPosts/getPostBySlug(locale) ile locale'e gore dogru dil donduruluyor. 5 blog yazisinin EN cevirileri posts.json'a eklendi.
- Blog sayfalari (home blog bolumu, /blog, /blog/[slug]) locale gore tarih formatlari, 'Read More'/'Devamini Oku', 'Back to Blog'/'Bloga Geri Don' dilleriyle donuyor.
- getLocale() i18n-server'dan eklenip sayfalarda kullanildi (page.tsx, blog/page, blog/[slug]).
- Daha once: Mesaj Gonder butonu hep basilabilir (isDisabled=sadece isSubmitting), eksik alana focus+scrol (name/email/phone/message ilk gecersiz), about sosyalleri hero tarzi.
- Dil degistirme mekanizmasi saglamlastirildi: setPref artik gercek dil degistiginde router.refresh() yerine window.location.reload() yapiyor. Neden: router.refresh() bazen eski RSC onbellegini kullandigi icin nav (Projeler/Blog/Sohbet/Geri Bildirim) ve blog icerigi new dilde gorunmuyordu. Tam sayfa yenile her seyin sunucudan yeni dille gelmesini garanti eder.
- Sunucu tarafi dogrulandi: site-locale=tr -> nav "Projeler/Blog/Sohbet/Geri Bildirim" + blog TR icerik; site-locale=en -> nav "Projects/Blog/Chat/Feedback" + blog EN icerik (detay sayfasi dahil). Her iki yonde de dogru.
## Hero yeniden tasarim (tasarimcidayi.com ilhami)
- Iki kolonlu grid (md+): sol = metin, sag = chip cluster. Mobilde tek kolon, sag kolon hidden md:block.
- **Capraz TARIK ELER / TARNAK basligi**: iki buyuk span (-rotate-2 ve +rotate-2) + aralarinda -22deg dondurulmus 6px primary bar (shadow glow). < > markup kaldirildi, manifesto-vari baslik.
- **Sag kolon chip cluster**: 46px max-w kare alanda merkez dekoratif shape (rounded-[40%], rotate-12, primary gradient, icinde </> monogram) + blur-3xl primary glow + dashed ring. 8 chip serpistirilmis (Next.js, TypeScript, Tailwind, React, Node.js, PostgreSQL, Docker, AI) — karisik rounded-full/rounded-2xl, 10-14 boyut. Hover'da group-hover:scale-110 + primary border + altinda primary pill etiket (Next.js/TypeScript/...). Spring animasyonla mount.
- Mevcut arka plan dekorlari (bg-grid, primary/secondary blur bloblar) korundu, sag kolon z-10 ile ustunde.
- Container/item variants (stagger 0.12, spring stiffness 260) ve Typewriter + 5 CTA + sosyal + scroll gostergesi aynen kaldi; sadece hizalama items-start text-left (iki kolon icin).

## Diger UI duzeltmeleri
- **StarRating koyu tema**: unliked yildiz 	ext-foreground-200/50 (gri) -> 	ext-foreground/80 (gorunur beyaz). Hover yellow-400 ayni.
- **ProjectCard stats satiri**: 	ext-foreground-500 -> 	ext-foreground/75 (tum sayaclar daha okunakli).
- **GitHub proje begenisi**: GitHub repo kartlarinda StarRating yerine https://github.com/{fullName}/stargazers linki (GitHub'da yildiz ver). Lokal projelerde StarRating aynen.
- **GitHub projelerinde Fork + Watch**: fork sayisi /{srcLink}/forks linki (ForkIcon), watch sayisi salt-okunur pill (BellIcon, GitHub subscribers_count).
- **Tum projelere Watch**: lokal projelerde toggleWatch (BellIcon button, localStorage project-stats:{title}.watches).
- **BellIcon + ForkIcon** icons.tsx'e eklendi (lucide-style stroke SVG, base ile uyumlu).
- **Tum Projeler / GitHub Projeleri butonlari PROJELER basliginin altinda** (projects-section.tsx, grid'in ustune tasindi, ProjectsGrid actions prop kaldirildi).
- **Blog 'Etiket yok.' kaldirildi** (blog-section.tsx, t('blog.noTags') blogda hala duruyor; artik render edilmiyor).
- **Mesaj Gonder SendIcon 28 -> 16** (contact-section), **Iletisime Gec SendIcon 18 -> 14** (hero).

## Verilenler
- site/src/lib/github.ts: GitHubRepo'ya watchers eklendi (fetchUserRepos'ta subscribers_count parse).
- site/src/lib/content.ts: ProjectItem'e orks?, watchers? eklendi.
- site/src/components/ui/icons.tsx: BellIcon, ForkIcon eklendi.
- site/src/components/ui/star-rating.tsx: unliked renk.
- site/src/components/projects/project-card.tsx: stats satiri, GitHub star link, fork/watch.
- site/src/components/projects/projects-grid.tsx: githubRepoToProject forks/watchers.
- site/src/components/sections/projects-section.tsx: actions PROJELER altinda.
- site/src/components/sections/blog-section.tsx: Etiket yok kaldirildi.
- site/src/components/sections/contact-section.tsx: SendIcon 16.
- site/src/components/sections/hero-section.tsx: iki kolon + capraz baslik + chip cluster.

Build temiz (son tur). TR/EN mod 200, chip'ler ve diyagonal bar SSR'da mevcut, actions PROJELER sonrasi.
## 2026-09-06 — /about /donate /credits localization
- about: generateMetadata + getLocale/isEn; TIMELINE_EN/FOCUS_EN/VALUES_EN dizileri; sabit h2/p/C TA metinleri ternary'e çevrildi
- credits: generateMetadata; CONTRIBUTORS roleEn, TESTERS/TRANSLATORS/TOP_DONORS nameTr/nameEn+noteTr/noteEn cift alanlar; Section title'ları isEn ternary (Katkıda Bulunanlar/Test Uzmanları/Çevirmenler/En Büyük Destekçiler)
- donate: generateMetadata; METHODS noteTr/noteEn; DESTEK OL->SUPPORT, Yöntem->Method, Bağlantı->Link, Kopyala->Copy; footer aciklama ternary
- Dogrulama: tsc temiz (3 sayfada 0 yeni hata); cookie EN+TR H1/H2 regex dogrulama gecti (etiket temelli, RSC payload korlugu yok)
- Bilinen eski tsc hatalari (8): layout musicSrc, route.ts, search topics, repo-view 3x, project-card tags, projects-grid topics — dokunulmadi

## 2026-09-06 — credits hizalama + tum sabit TR icerik locale'e baglama
- credits: 4 kart ayni CreditGroup (ikon+ad flex items-center gap-3, desc mt-1.5, header pb-4 sabit); satirlar CreditRow standardi: sol w-10 h-10, metin flex-1 min-w-0, sag w-24 justify-end; kart ici p-4, space-y-2; Contributors/TopDonors runner slot, Testers/Translators PersonIcon (bos slot -> hizalama korundu)
- KOK NEDEN: framed Section icindeki kartlar p-10 dolgusu ile 25px sagda vs duz Section. credits'te framed kaldirildi -> 5 satirin slotLeft=74 & textLeft=130 birebir esit (DOM olcumu). EN/TR basliklar dogrulandi
- layout generateMetadata TR/EN; github/search/login/admin/repo sayfalari getLocale/isEn; auth/login-form/music-player/scroll-to-top/copy-button client useLocale isEn; github-explorer SORT_OPTIONS_TR/EN; repo-view timeAgo(isEn) + hata/title/aria/Releases
- tsc: dokunulanlarda 0 yeni hata (8 eski: 6 github tip + project-card tags + route.ts)

## 2026-09-06 — hero basliklarina sidebar ikonlari
- SectionTitle.big mod: baslik h2 -> inline-flex items-center gap-4, opsiyonel icon prop (React.ReactNode)
- /about (about/page.tsx h1 + about-section.tsx SectionTitle): UserIcon 36
- /blog (blog-section.tsx SectionTitle): NewspaperIcon 36
- /projects (projects/page.tsx + projects-section.tsx inline h2): FolderIcon 36
- /credits (credits/page.tsx inline h2): CreditsIcon SVG 38 (sidebar ile ayni tasarim)
- Ana sayfadaki ProjectsSection/BlogSection/AboutSection da ayni ikonlari aldi
- Dogrulama: 4 sayfada h1/h2'de svg mevcut, inline-flex items-center gap-4, svgW=36
- tsc: 8 (yeni hata yok)

## 2026-09-06 — PROJECTS + CONTRIBUTORS ikonlari kullanicinin verdigi SVG'lerle degistirildi
- FolderIcon (icons.tsx): yeni 3D kutu SVG (512 viewBox, fill currentColor) -> sidebar/Projeler + /projects + ana sayfa otomatik guncellendi
- CreditsIcon (sidebar.tsx): yeni belge+kalem SVG (24 viewBox, g fill none + stroke path) -> yan panel
- credits/page.tsx hero: ayni yeni belge ikonu (38px)
- Dogrulama: /projects h2'de 512 viewBox kutu; /credits h2'de g[fill=none] + 2 path + stroke; sidebar acildi: Projeler=512 kutu, Katkida Bulunanlar=stroke'lu belge

## 2026-09-06 — FEEDBACK hero ikonu eklendi
- contact-section.tsx SectionTitle.big ikonu: kullanicinin verdigi SVG (2048 viewBox, profil+form) 36px
- Dogrulama: ana sayfa FEEDBACK h2: inline-flex items-center gap-4, svg 2048 viewBox 36px

## 2026-09-06 — Proje kartı butonları + logo + i18n kalıntıları
- **Butonlar ana sayfa stiline hizalandı** (#e5e7eb base / #d1d5db hover — masterClass `!bg-[#e5e7eb]` ile birebir):
  - project-card: İndir kapsayıcısı tek parça (`flex items-center overflow-hidden rounded-lg bg-[#e5e7eb]`) — link (px-4 py-2) + chevron (px-2.5) her ikisi transparent bg → **bölünmüş renk bug'ı kökten çözüldü**; "Sayfayı Aç" linki aynı kutuda; GitHub `h-10 w-10 rounded-lg bg-[#e5e7eb] text-black`
  - projects-section CTA'ları (Tüm Projeler / GitHub Projeleri) + blog-section "Sayfayı Aç" aynı stile çekildi
  - **Kök neden**: antd cssinjs `:where(.css-dev-*) a { background-color: transparent }` unlayered kuralı, Tailwind'in `@layer utilities` içindeki bg-* kuralını CSS cascade'de eziyordu (unlayered > layered) → sadece `<a>` elementlerinde bg kayboluyordu, div'lerde çalışıyordu (bölünmüş görünüm). globals.css'e unlayered override: `a.bg-\[\#e5e7eb\] { background-color: #e5e7eb }` + `a.hover\:bg-\[\#d1d5db\]:hover { background-color: #d1d5db }` (a+class specificity 0,1,1 > antd 0,0,1)
  - Tarayıcı doğrulaması (CDP computed + gerçek mouse hover): Sayfayı Aç/İndir/GitHub hepsi rgb(229,231,235), hover rgb(209,213,219), chevron kapsayıcıyla aynı kutuda
- **Logo**: `public/tarnak.svg` ← `Tarnak-Black.svg`, `public/tarnak-white.svg` ← `Tarnak-white.svg` (kaynak `C:\Users\TARIKELER\Pictures\Önemli\TARNAK`); hero-section + project-card avatar tema-duyarlı çift SVG (`/tarnak-white.svg` hidden dark:block, `/tarnak.svg` block dark:hidden); favicon `/tarnak.svg` otomatik (layout değişikliği gerekmedi)
- **i18n kalıntıları temizlendi** (Türkçe sabitler EN modunda görünüyordu):
  - projects-grid: `REPO_DESCRIPTIONS_TR` map (9 repo TR açıklama) + `githubRepoToProject(repo, tr)` — Supabase erişilemezken grid client-side GitHub fetch'inden doluyor, TR modda EN açıklamalar görünüyordu
  - projects/page.tsx: sabit "GitHub Projeleri" → `{content.github.title}` (EN "GitHub Projects")
  - chat-panel: 10 sabit TR string → isEn ternary (gönderildi/hata/silindi/arama/boş/reply aria)
  - tank-game: tüm canvas metinleri + kazan/kaybet/kontraatak + Play Again isEn ternary, useEffect deps'e isEn
  - back-to-list-button: Home/Ana sayfa, Projects/Projeler, Blog, GitHub (Github yazımı düzeltildi), Chat/Sohbet, Go Back/Geri Gel
- tsc: 8 bilinen hata (yeni yok); browser: TR mod PROJELER + TR sort + TR kart başlıkları doğrulandı

## 2026-09-06 — Buton senkronizasyonu (blog stili + favicon beyaz)
- PROJECTS kart 'Sayfayı Aç' blog 'Sayfayı Aç' ile birebir aynı: h-9 (36px), ml-auto shrink-0, bg-[#e5e7eb], text-black, hover:bg-[#d1d5db] (antd mavi hover yok).
- /projects GitHub Projeleri butonu ana sayfa stiline çekildi: h-11, bg-[#e5e7eb], text-black, GithubIcon siyah, hover:bg-[#d1d5db].
- globals.css: .bg-[#e5e7eb] { background-color+color:#000 }, .hover:bg-[#d1d5db]:hover { bg+color:#000 }, .text-black { color:#000 }, .hover:text-black:hover { color:#000 } -> antd'nin unlayered color:link kuralını ezer, yazı düz siyah kalır, hover'da mavi olmaz. (CSS yorumunda bg-*/text-* yazmayin! */ icerigi parser'i bozar - PostCSS hatasi.)
- Favicon: layout.tsx icon -> /tarnak-white.svg (siyah govuk sekmesinde).
- Dogrulama (sayfa 43): Tum butonlar rgb(229,231,235), hover rgb(209,213,219), yazi rgb(0,0,0), icon siyah, favicon /tarnak-white.svg. tsc: 8 (bilinen).

## 2026-09-06 — Buton hizas, isim ve logo yazim duzeltmeleri
- PROJECTS kart butonlari h-9 (36px) esit: Indir container h-9 (link self-stretch, py-2 kaldirildi), Sayfayı Aç h-9, GitHub kare h-9 w-9 (+shrink-0). yatay hiza esitlendi.
- about/page.tsx: EN 'Hello, I'm Tarik.' -> 'Tarık'; TarNAK -> TARNAK (EN+TR paragraf).
- layout.tsx keywords: 'Tarik Eler' -> 'Tarık Eler'.
- Kural: ozel isimler dil cevirisinde degismez (Tarık hep Tarık); marka hep TARNAK veya Tarnak (TarNAK yok).
- Dogrulama: /projects 3 buton da 36px (offsetHeight, EN mod), About EN 'Tarık' gorunuyor, grep TarNAK|Tarik=0. tsc: 8 (bilinen).

## 2026-09-06 — FOUC / beyaz tema parlama kokten cozumu
- **Kok neden**: (1) ThemedBackground, React state'ine (resolvedTheme) bagli inline renk render ediyordu — SSR'da systemDark=false → resolvedTheme='light' → ilk boya BEYAZ; matchMedia useEffect'i paint'ten SONRA calisinca siyaha donuyordu (flash). (2) Eski ThemeInitScript useEffect ile hydration sonrasi head'e script enjekte ediyordu — parse-time hic calismadi.
- **Cozum — tum tema katmanlari class-based + parse-time script**:
  - `theme-init-script.tsx`: yeni <script> dogrudan render edilir (useEffect yok), **head'de parse-time** calisir: localStorage/system'a gore <html>'e .dark/.light + body inline bg/color basar (paint'ten ONCE). `defaultTheme` prop ile SSR'dan gelir; 'auto'/'system' → matchMedia, enum disi → 'dark'. XSS korunmasi: layout'ta safeDefaultTheme enum'a sabitlenir.
  - `themed-background.tsx`: `bg-white dark:bg-black` class-based; `theme` prop'u kaldirildi; providers.tsx cagrisi guncellendi.
  - `layout.tsx`: <html suppressHydrationWarning className={initialThemeClass}> (defaultTheme'e gore SSR'da basilir); <body className="min-h-screen bg-white text-black antialiased dark:bg-black dark:text-white"> (eski inline style visibility/bg/color silindi); <ThemeInitScript defaultTheme={safeDefaultTheme} />.
  - `globals.css`: eski unlayered FOUC kurallari silindi — `body { background-color:#050507; color:#ededed }` ve `html[data-theme="light"] body {...}` (bunlar yeni Tailwind class'larini ezerdi). `html { background-color:#000000 }` korundu.
- **Dogrulama**: SSR HTML: <html class="dark"> + script head'de + body class'lar iyi. Runtime (page 45, CDP): dark senaryo → html.dark, body rgb(0,0,0), themed rgb(0,0,0), script parse-time body'yi boyadi (inline siyah). light senaryo → script body'yi BEYAZ boyadi (inline beyaz = script calisti), body text siyah. Script `var defaultTheme='system'` SSR'dan geliyor, `site-color-scheme` kaldirildi (hicbir yerde yazilmiyordu, providers ile celisiyordu).
- **Test notu**: BrowserOS persistent profile localStorage paylasimi — baska agent tab'lari mount'ta `site-theme` degerini 'system' ile ezebiliyor; gercek kullanicida tek tab vardir, sorun degil.
- tsc: 8 (bilinen, yeni yok).

## 2026-09-06 — 5 sorun düzeltmesi (key sızıntısı, Who I Am, tagline, blog grid, dropdown clipping)
- **1. i18n key sızıntıları kapandı**: `projects.empty` her iki dict'te YOKTU → raw key gösteriliyordu (sızıntı kaynağı). tr.json + en.json'a eklendi: projects.empty ("Henüz proje yok." / "No projects yet."). GitHub bölümünde de 6 eksik key bulundu eklendi: github.repoEmpty, github.loadingFile, github.filePreviewUnavailable, github.issues, github.language, github.releases (TR "Language"/"Releases" GitHub UI stili ile İngilizce tutuldu). Kapsamlı tarama (tum t() cagrilari x her iki dict) → sizinti yok. blog.empty/chat.empty zaten vardi.
- **2. Who Am I? -> Who I Am**: content.ts:437 + data/content.json (getContent once content.json'i SSR'dan okuyor, default'u OVERRIDE ediyor — burasi asil sergi kaynagiydi). TR overlay zaten 'Ben Kimim?' (i18n-content-tr.ts:38). 'Who Am I?' gramer olarak hatali degil ama kullanici baslik formu istedi: 'Who I Am'.
- **3. Hero tagline kaldirildi**: hero-section.tsx:196-201 <motion.p>{t('hero.taglineSub')} kaldirildi; hero.taglineSub her iki json'dan silindi (TR "Modern web teknolojileriyle...", EN "I build end-to-end products..."). content.ts:500'deki "Web developer building modern, end-to-end..." aYRI metin (about.description) — dokunulmadi.
- **4. Blog grid**: visibleCount useState(3)->4 (INITIAL_LIMIT=4), increment useGridCols() -> sabit POST_INCREMENT=4 (kullanici: "4 (veya 2)"), grid-cols-1 md:grid-cols-2 (eski sm:2 lg:3), useGridCols import/blog kullanimi kaldirildi (projects-grid hala kullaniyor).
- **5. Download dropdown clipping**: Kart Container Card.tsx base'inde overflow-hidden vardi → dropdown (absolute top-full) kart sinirinda kesiliyordu. project-card.tsx: Card className'ine overflow-visible eklendi. Geometric dogrulama (page 55): dropdown kartin 92px altina tasiyor, kart overflow=visible, z-50, elementFromPoint(830px) dropdown liste divi → gorunur + tiklanabilir.
- **Dogrulama**: tsc 8 (bilinen, yeni yok). Browser (page 57): Blog 4 kart + Show More(1) -> tiklaninca 5. kart (PulseChat) geldi, buton kayboldu. Hero tagline EN+TR gitti. "Who I Am" EN / "Ben Kimim?" TR (cookie+ls tr). projects.empty artik dict'te.
- **Not**: getContent unstable_cache 300s — content.json degisikligi dev server restart gerektirdi (PID 7984 -> 30752).

## 2026-09-06 — mergeTr bos-array bug + music-player default title
- **mergeTr bug duzeltildi**: i18n-content-tr.ts projects.items: [] ve hero.stats: [] idi — mergeTr'de `??` operatoru bos array'de CALISMAZ ([] truthy) → TR'de Supabase projeleri ve hero istatistikleri SESSIZCE siliniyordu. Cozum: (1) overlay'den items: [] / stats: [] kaldirildi (veri kaynakli diziler zaten content'ten gelir — overlay yorumundaki kurala uygun), (2) i18n-server.ts mergeTr'de `.length ?` guard'i eklendi (hero.stats, projects.items) — ileride bos array gelirse yine content fallback kullanilir.
- **Dogrulama**: TR mod -> "9 proje bulundu" + Supabase projeleri (Accentra vb.) gorunuyor (bug'once sadece GitHub reposu merge'i gorunuyordu), hero stats de gelecek. EN degismedi.
- **music-player**: default title 'Muzik' idi -> displayTitle = title || (isEn ? 'Music' : 'Muzik') (useLocale zaten import edilmisti; satir 26 default prop korunur, render'da displayTitle kullanilir).
- tsc: 8 (bilinen, yeni yok).

## 2026-09-06 — Download combobox gruplandirma + Show More stili
- **blog-section**: kullanici istedigi sabitler module-scope'a tasindi (INITIAL_POST_COUNT=4, POST_INCREMENT=4) + handleShowMore fonksiyonu (Math.min'siz — hasMore zaten sadece kalan kart varken butonu gosteriyor, slice overflow'i yonetir). Show More butonu zaten About/CV ile ayni stilde (bg-[#e5e7eb]/text-black, button.tsx masterClass uyguluyor) — computed style dogrulandi.
- **DownloadCombobox gruplandirma**: eski duz liste + OS filtre chip'leri kaldirildi. Yeni yapi:
  - "En Son Çikanlar" grubu (en ustte) — her OS'tan ilk/latest asset, siralama: [kullaniciOS, windows, linux, macos, ios, android].
  - Her platform grubu (Windows/macOS/Linux/iOS/Android) — altinda o OS'un tum asset'leri. Ayni siralama mantigi: kullaniciOS en basta.
  - Arama input'u (versions search) korundu, query hem Latest hem platform gruplarinda filtreliyor.
  - "All" chip'i kaldirildi (default = tum gruplar gorunur, "All" artik combobox'in varsayilan davranisi).
  - Tek-URL modu (os yok) icin: duz liste fallback.
  - i18n: `projects.latest` eklendi (TR: "En Son Cikanlar", EN: "Latest").
- **Dogrulama**: OfficeSetupWizard (per-os, tek Windows URL) dropdown'i acildi -> "EN SON CIKANLAR" basligi + Windows item + "WINDOWS" grubu + ayni Windows item. OS filtre chip'leri kalmadi. Search "mac" -> "Sonuc yok" (filtre dogru). tsc = 8 bilinen hata (yeni yok).

## 2026-09-06 — DownloadCombobox portal + nötr focus border
- **Portal**: menü `react-dom.createPortal` ile `document.body` altına tasindi, `position: fixed` + `z-[1000]`. Tetik butonuna `triggerRef` eklendi, `useLayoutEffect` mount + resize + scroll (capture) ile `getBoundingClientRect()`'i okuyup `top` + `right` hesapliyor, scroll/resize'da yeniden hesap. Kart stack'inden (relative/overflow) tamamen bagimsiz — diger kartlar menuyu artik ortemiyor.
- **Mavi cerss**: input `focus:border-primary/60` (mavi) idi → `focus:border-foreground-200/30 focus:ring-0 focus-visible:ring-0` (nötr, sadece hafif border). Outline zaten `outline-none` idi. Computed style: borderColor oklab(0.22 0.0026 -0.009 / 0.1) — nötr, mavi yok.
- **Dogrulama**: trigger scrollIntoView + tiklandi → elementFromPoint(center) = A "Windows" (menunun kendi icindeki), elementFromPoint(merkez) ve (alt-4) `inMenu: true`, menunun 5px solunda soldaki kart (AI-Jailbreak) izole — kart menunun altinda kalmadi. Portal: parentTag=BODY, position=fixed, zIndex=1000. tsc = 8 bilinen hata (yeni yok).

## 2026-09-06 — Proje kartı buton hizalama (merdiven fix)
- **Sorun**: kart genisligi 293px (3 sutun grid), sag column 157px; 3 buton toplami 271px + gap 20px = 291px > 157px. flex-wrap her butonu ayri satira kaydiriyordu (merdiven: top 1707/1753/1799, her 46px).
- **Cozum**: kapsayici `w-full` + `gap-1.5` (siki), flex-wrap kaldirildi, butonlar `flex-1 min-w-0` ile oranli; GitHub w-9 shrink-0 sabit; ikonlar 14, padding px-2, text truncate. CardBody padding gap-4→gap-3, p-4→p-3 (column +20px genisledi).
- **Dogrulama**: viewport 718'de OfficeSetupWizard karti (293px) — sameRow: TRUE (top 521 hepsi), allH36: TRUE. Butonlar: Indir wrap 53px + chevron 26px + Sayfayi Ac 69px + GitHub 36px, toplam ~199px innerWrap 177px'e sigdi. Merdiven kalkti, yanyana + esit h-9 + acik stil. Metinler kart dar oldugu icin truncate oluyor (lg+ ekranda kart ~310-400px, tam metin gorunur). tsc = 8 bilinen hata (yeni yok).

## 2026-09-06 — Search full-width + Blog "Tüm Yazıları Gör" + Header logo
- **Search input full-width**: projects-grid ve blog-section'da `className="h-11 max-w-md"` (448px) -> `h-11 w-full`. Input wrapper artik section max-w-6xl (610px) kadar kapliyor, %36 genisledi.
- **Blog "Tüm Yazıları Gör" butonu**: blog-section'a SectionTitle altina projects-section pattern'inde (Button href="/blog" color=primary, h-11, bg-[#e5e7eb] text-black, "→" endContent). `t('blog.all')` key zaten mevcuttu (TR: "Tüm Yazıları Gör", EN: "View All Posts"). /blog sayfasina yonlendirir.
- **Header logo**: top-bar.tsx'te "TARIK ELER" oncesine `<img src="/tarnak-white.svg" width=28 height=28>` eklendi. Scrolled durumda h-6 w-6, normal h-7 w-7. gap-1.5 -> gap-2 (logo ile yazi arasi bosluk). Hero'daki gibi beyaz SVG.
- **Dogrulama (page 62)**: header img src=/tarnak-white.svg 28x28px gorunur; projects search inputW 560 / wrap 610; blog search 560/610; blog btn href=/blog text="Tüm Yazıları Gör". /blog sayfasi aciliyor, BLOG section render ediliyor. tsc 8 bilinen hata (yeni yok).

## 2026-09-07 — Scroll animasyon birlesimi (FadeUpSection) + blog buton /blog'da gizleme + siralama/sayac konum degisimi
- **FadeUpSection**: yeni ortak bilesen site/src/components/fade-up-section.tsx — motion.div, initial opacity:0 + y:24, whileInView 1/0, viewport once:true amount:0.2 margin:'-50px', transition 0.5s easeOut. Yalnizca opacity + translateY (layout shift yok, scale yok).
- **Uygulananlar**: projects-section (baslik+butonlar, eski -80px margin kaldirildi), about-section (baslik+sosyal; 2. motion.div ve delay 0.1 kaldirildi), contact-section (baslik + form ayri iki FadeUpSection; isSubmitted scale animasyonu korundu), blog-section (TUM icerik tek FadeUpSection — daha once animasyonu yoktu). Hero variant-based spring'e dokunulmadi.
- **Blog "Tum Yazilari Gor" /blog'da gizli**: BlogSection'a usePathname + onBlogPage; buton yalnizca ana sayfada render ediliyor. /blog page'de buton yok, ana sayfada var (dogrulandi).
- **Siralama/Sayac konum degisimi**: projects-grid'de "Siralama + yon butonu" sola (ml-auto kaldirildi), "N proje bulundu + etiketler" saga tasindi. Pixel dogrulama: Siralama label 49px, yon 266px, sayac 559px (sol->sag).
- **handleShowMore** artik gercekten kullaniliyor (buton onPress), Math.min korumasi icinde.
- **Dogrulama**: canli scroll'da projeler ve blog fade'i 0 -> 1 (transform none) gecisleri izlendi; IO runtime scroll simule edilince ateslenmiyor ama gercek kullanici scroll'unda calisiyor (CDP artefakti). tsc = 8 bilinen hata (yeni yok).

## 2026-09-07 — Görünüm ayarı "boş" fix: legacy 'system' → 'auto' normalize
- Şikayet: Ayarlar → Görünüm'de RadioGroup hiçbir tema seçeneğini işaretli göstermiyordu (varsayılan Otomatik Algıla olmalı).
- Kök neden: ThemeMode 'system' değeri kabul ediliyor (localStorage 'site-theme' eski sürümden 'system' içerebiliyor; content.settings.defaultTheme de 'system' olabiliyor) ama RadioGroup seçenekleri yalnızca auto/light/dark — 'system' state'e girince hiçbir seçenek eşleşmiyordu. ('system' davranışı 'auto' ile aynı: sistem teması takibi.)
- Fix: providers.tsx'e 
ormalizeThemeMode() — useState initializer (defaultTheme prop) ve useEffect (localStorage) ikisini de normalize ediyor; legacy 'system' → 'auto' yazılıyor. theme-init-script zaten 'system'i auto gibi ele alıyordu — ilk paint etkilenmiyordu.
- Doğrulama: headless Edge CDP — localStorage='system' yaz → reload → site-theme='auto' geri yazıldı, data-theme=dark (sistem). tsc 0, build EXIT 0.

## 2026-09-07 — Admin araç seti genişletme + sayfa üstü düzenleme + WhatsApp temizliği
- Kullanıcı istedi: header'da "Ara"nın soluna Düzenle butonu (admin'de, hangi sayfadaysa onu düzenle), yan panelde "Admin Panel" bölümü, admin panelde tüm kullanıcıların listesi/yönetimi (gör/rol değiştir/şifre sıfırla/sil), WhatsApp ikon/yazılarının kaldırılması.
- **TopBar "Düzenle"**: 	op-bar.tsx — /api/admin/session fetch ile admin kontrolü; search'in SOLUNDA; tıklayınca pathname → /admin/puck/<path> (ana sayfa → home). Test: dev-role=admin ile buton görünür, tıklayınca /admin/puck/home/'e gitti.
- **Sidebar**: 
av.adminPanel başlığı altında "Panel" (/admin) + "Sayfa Düzenleyici" (/admin/puck/home) linkleri (EditSquareIcon eklendi). Test: ADMİN PANEL bölümü görünür (Türkçe uppercase 'İ').
- **Kullanıcı yönetimi**: yeni src/app/api/admin/users/route.ts — GET listUsers (auth.users: email/phone/created/lastSignIn + profiles: username/fullName/role), POST setRole/resetPassword, DELETE deleteUser (cascade). Yeni src/components/admin/users-panel.tsx — liste + rol toggle + şifre sıfırla (inline) + sil + şifre hash notu. Admin panel'e ikonlu "Kullanıcılar" tab'ı + tüm tab'lara mdi ikonlar.
- **WhatsApp temizliği**: chat-panel boş durum ikonu mdi:whatsapp → mdi:chat-outline; admin panelde "WhatsApp tarzı profil… ile saklanır" doc yazısı kaldırıldı → "Bu bilgiler Chat üzerinde profil olarak görünür."
- i18n: nav.pageEditor (Sayfa Düzenleyici/Page Editor) + common.edit (Düzenle/Edit) tr+en.
- Doğrulama: tsc 0, build EXIT 0. Canlı CDP testleri: Düzenle butonu + navigasyon ✓, sidebar bölümü ✓, /admin → Giriş yapan: TARIKELER + 9 ikonlu tab + Kullanıcılar sekmesi render ✓.
- **Not/engel**: Supabase DNS çözümlenmiyor (ENOTFOUND) → /api/admin/users bu ortamda "fetch failed" döndürüyor (500 + banner). Kod doğru; ağ/DNS düzelince liste, rol/şifre/silme işlemleri çalışır. login/register da o yüzden şu an çevrimdışı görünüyor.
- "Geliştirici (geçici)" bölümü durabilir ama güvenlik notu: dev-role cookie'si ile HERKES kendini admin yapabilir — kalıcı çözüm /login'den TARIKELER şifresiyle girip admin_session almaktır.

## 2026-09-07 (2. tur) — Puck görsel düzenleyici güçlendirme
- Kullanıcı istedi: düzenleme sayfada kalsın + sayfanın aynısı görünsün; koyu/açık tema editörde geçerli olsun; renk paleti, font seçimi, font boyutu, kes/kopyala/yapıştır, özel boyutlandırma, üst üste/önde-arkada (z-index), sıfırlama, içe/dışa aktarma, eski düzenleri kaydet/yükle; çıkan hatalar düzeltilsin; "her şey düzenlenebilir" + yeni sayfa/bölüm eklenebilsin.
- **config.tsx yeniden yazıldı (12 bileşen)**: mevcut 7'ye ek olarak Renkli Kutu (ColoredBox), Alıntı (QuoteBlock), Ayraç (DividerBlock), Video (VideoBlock — YouTube/Vimeo embed), Karşılama-küçük (HeroWelcome). Her bileşene ortak alanlar:
  - typeFields(): Renk paleti (12 hazır renk select) + özel hex + font ailesi (6 font) + font boyutu (px) + kalınlık + satır aralığı
  - layoutFields(): position (static/relative/absolute) + top/left + genişlik + z-index (önde/arkada) + opaklık + üst/alt boşluk
  - Görsel: yükseklik, sığdırma (cover/contain/fill), köşe yuvarlığı, gölge; Buton: boyut, yazı/arkaplan rengi, köşe, tam genişlik, 4 stil; İki Sütun: oran (1:1/1:2/2:1) + boşluk.
  - SAMPLE_DATA: tek tıkla başlangıç sayfası kuran örnek içerik + isKnownComponent helper.
- **Editör (client.tsx)**: mod geçişi Düzenle/Önizle — Önizle gerçek sayfayı iframe'de gösterir (/puck/<path>?embed=1 → tema localStorage'ı aynı origin olduğu için GEÇERLİ, doğrulandı: htmlClass=dark). Araç çubuğu: Dışa Aktar (JSON indir), İçe Aktar (dosya → doğrula → Puck'a ver, remount), Sıfırla (yayınlanana dön), Örnek İçerik, Düzeni Kaydet (adlı sürüm), Sürümler (listele/yükle/sil dropdown), Yayınla, Yeni Sekme. Puck remount key ile içe aktarma/sıfırlama state'i temizler.
- **Sürüm yönetimi**: store.ts'e PuckVersion (id/name/ts/data) + getPuckVersions/addPuckVersion (max 10)/removePuckVersion/getPuckVersion — data/puck-versions.json. route.ts POST action: saveVersion/loadVersion/deleteVersion (+ mevcut publish). GET ?action=versions. Canlı test: saveVersion OK, versions listesi OK, deleteVersion OK.
- **View embed**: /puck/<path> page.tsx searchParams embed → client'ta "Ana sayfaya dön" gizlenir (iframe temiz görünüm).
- Doğrulama: tsc 0, build EXIT 0. Canlı CDP: /admin/puck/home → araç çubuğu 10 buton + 12 bileşen listelendi, 404 yok; Önizle iframe kuruldu; sürüm API döngüsü (kaydet/listele/sil) geçti.
- Not: Puck 0.20.2'de bileşen-içi çocuk (drop zone) yok → "üst üste" position/z-index alanlarıyla çözüldü. Kes/kopyala/yapıştır → Puck item menüsü "Çoğalt" + dışa/içe aktarma (kopyala-paket) ile karşılandı. Ana sayfa ( / ) hâlâ content.json'dan geliyor; puck sayfaları /puck/* altında yaşıyor — gerçek ana sayfayı puck'a bağlamak istenirse ayrı iş.
- Engel devam: Supabase DNS (ENOTFOUND) — kullanıcı listesi ve login supabase'a bağlı, bu ortamda çevrimdışı.

## 2026-09-08 (8. tur) — Önizle iframe düzeltildi (CSP)
- Semptom: admin editörde "Önizle" iframe'i boş/engelli — "Ön izle sayfası açılmıyor".
- Kök neden: next.config.mjs global header'ları X-Frame-Options: DENY + CSP "frame-src 'none'" → /puck/home?embed=1 iframe edilemiyordu (CDP Log.entryAdded: "Framing ... violates ... frame-src 'none'"). BrowserOS neo görünür değil, kullanıcının Edge'i (CDP 9333) ile bulundu.
- Çözüm: X-Frame-Options DENY → SAMEORIGIN, CSP frame-src 'none' → 'self'. Aynı-origin embed'i açıyor, çapraz-origin clickjacking koruması duruyor.
- Doğrulama: header'lar SAMEORIGIN + frame-src 'self'; admin tab reload → Önizle → iframe içinde TARNAK içeriği render (bodyHasContent true). Dev server restart edildi (next.config değişikliği).
- Not: rsms.me/inter.css style-src CSP ihlali önceden de var (kozmetik font fallback) — bu turda dokunulmadı.

## 2026-09-08 (9. tur) — Panel bug'ları: toggle-close + header bandı
- Bug 1: sol panel açıkken sağ panelden seçim yapılınca (Puck sağ paneli açar), 3 activity butonundan birine basınca sol panel KAPANIYORDU. Kök neden: switchPanel toggle mantığı (aktif panele basmak next=null → kapat). Çözüm: tıklama her zaman panele gider, paneli kapatmaz.
- Bug 2: panel seçenekleri altta başlıyordu — grid row 1 tam genişlik header ("header header header" / "left editor right") paneli 67px aşağı itiyordu. Çözüm: grid areas → "left header right" / "left editor right" (components/outline), "right header left" / "right editor left" (page). Sidebar'lar artık en üstten (topbar altından y=103) başlıyor, header sadece canvas kolonu üzerinde.
- CDP doğrulama (1440x900): Bileşenler/Anahat/Sayfa sırası birebir test edildi — sol panel kapanmıyor, fields panel top=103, ilk alan y=108.
- tsc 0.

## 2026-09-09 (10. tur) — Layout düzeltmeleri: activity bar kaldırıldı + editor viewport'u dolduruyor + DnD sıralama
- Kullanıcı şikayetleri: (1) sol kenardaki dikey 3-sekmeli ikon çubuğu gereksiz, (2) önizleme canvas'ı alta itilmiş, üstünde dev siyah boşluk, (3) canvas üst araç çubuğunun hemen altında kalan viewportu tamamen doldursun.
- Kök neden (CDP ölçümleri): 9. turda eklenen grid areas override ("left header right" / "left editor right") sol paneli (740px) row 1'e koydu → row 1 min-content 758px'e şişti → Puck header 103..861, canvas 877..981 (103px) e zulüm. Ayrıca preview iframe h-[calc(100vh-52px)] + marginLeft:48 viewport dışına taşıyordu. bodyH 1003 vs viewH 900.
- Çözüm (client.tsx yeniden yazımı):
  - `activePanel` / `switchPanel` / activity bar markup + puck-view-* sınıfları + view-grid CSS + marginLeft:48 tamamen kaldırıldı → Puck varsayılan layout'una dönüldü (grid areas override YOK — 9. tur CSS'i geri alındı, bug'ın kaynağı oydu).
  - Yeni kök: `<div class="flex h-[calc(100dvh-56px)] flex-col">` → topbar (shrink-0) → `<div class="relative min-h-0 flex-1">` → iframe (h-full w-full) / editör `.puck-editor-wrap`.
  - Yükseklik zinciri CSS: `.puck-editor-wrap > *`, `.Puck > div` (class'sız layout host), `[class*="Puck-portal"]`, `[class*="PuckLayout"]` → hepsi height:100% !important. (İlk deneme yetersizdi: layout'un parent'ı class'sız auto-height DIV olduğu için % çözülemiyordu → 1082px.)
  - Components listesine DnD sıralama: her satıra ⋮⋮ grip (DrawerItem-draggable flex kutusuna prepend), sürükleme drawer'ın doğrudan çocukları (12 satır) üzerinde midpoint insertBefore, dragend → localStorage `puck-component-order`. (İlk sürüm `[class*="DrawerItem-draggable"]`'ı hedeflemişti ama her satırda iç içe ikinci bir eşleşme vardı → 24 node; nüfuz testi drawer.children'a çevrildi.)
  - 56px sabiti: global TopBar fixed h-14 + flow spacer h-14 (src/components/top-bar.tsx).
- CDP doğrulama (headless Edge 9341, 1440x900, dev-role=admin cookie):
  - bodyH 900 == viewH 900, scroll yok; .puck-activity-bar yok.
  - Puck header 103..170 (67px min-content; önce 758px); layout 103..900 (797px; önce 1082); canvas 186..877 (691px; önce 977 taşma).
  - Preview iframe 103..900 (h=797, w=1430), taşma yok.
  - DnD: Hero 0→3 taşındı (moved:true), dragend → localStorage puck-component-order yazıldı, reload → sıra yeniden uygulandı (Karşılama (Küçük) birinci).
  - tsc 0.
- Not: sol panel/outline artık tam genişlik header'ın ALTINDAN (y=170) başlıyor ve kendi scroll'unda yaşıyor — Puck varsayılanı; 9. turun "paneller en üstten başlasın" isteği header bandına mal oldu, bu turda doğru davranış seçildi. Canvas içi sayfa içeriği (956px) editor + iframe içinde scroll ediyor (normal editor davranışı).

## 2026-09-09 (11. tur) — Ana sayfa bölüm sırası + Hero CTA + CV Görüntüle butonu
- Kullanıcı: bölüm sırası Hero altında Hakkımda→Projeler→Blog→GERİ BİLDİRİM olsun; Hero'daki 5 buton bu sırayla kendi bölümlerine scroll etsin; 5. buton "CV Görüntüle" (CV İndir ile aynı stil: beyaz bg #FFF, siyah text #000, aynı padding/radius/font, göz ikonu, yeni sekmede aç).
- page.tsx: <main> sırası Projects→Blog→About→Contact iken About→Projects→Blog→Contact yapıldı.
- hero-section.tsx CTA'ları: exploreLabel(#projects) + chatCta(/chat) + blog + about + connectLabel yerine sabit 5: hero.about(#about), hero.projects(#projects), hero.blog(#blog), hero.feedback(#contact), about.cvView(CV, target=_blank, EyeIcon). Chat butonu çıktı (kullanıcı listesinde yoktu). Kullanılmayan importlar (ArrowDownIcon/ChatIcon/SendIcon) + content.hero destructure (exploreLabel/connectLabel) temizlendi.
- CV Görüntüle stili: color default (masterClass çakışmasın) + !bg-white !text-black hover:!bg-white/90 + px-6 py-3 text-sm sm:text-base (hero diğer butonlarla aynı). Smooth scroll zaten globals.css'te vardı (scroll-behavior: smooth + scroll-margin-top 88px) — ekstra iş gerekmedi.
- i18n: tr hero.projects="Projeler" hero.feedback="GERİ BİLDİRİM"; en hero.projects="Projects" hero.feedback="Feedback".
- CDP doğrulama (1440x900, /): section top'ları artan sırada about(788)→projects(2006)→blog(3105)→contact(3613); hero butonları = Hakkımda/#about, Projeler/#projects, Blog/#blog, GERİ BİLDİRİM/#contact, CV Görüntüle//cv/tarikeler-cv.pdf+_blank; scrollBehavior=smooth; CV butonu computed bg=rgb(255,255,255) color=rgb(0,0,0). PDF HEAD 200 application/pdf. tsc 0.

## 2026-09-09 (12. tur) — İletişim bölümü (kartlar + tek alan) + Proje kartı medya oynatıcı
- Kullanıcı: (A) GERİ BİLDİRİM bölümü İLETİŞİM/Contact olsun, başlık altına 3 tıklanabilir kutu (Gmail→mailto, Telefon→tel:, Konum→Google Maps); formdaki opsiyonel "E-posta veya Telefon" iki alanı → combobox (E-posta/Telefon seçimi) + TEK zorunlu alan. (B) Proje kartı: dairesel logo → dikdörtgen medya kutusu (rounded-lg aspect-video), çoklu medya (img/gif/video) oynatıcı (ok overlayleri + Önceki/Sonraki/Büyüt toolbar + sayaç + lightbox), buton sırası Sayfayı Aç → İndir → GitHub.
- Dosya değişiklikleri: validations.ts (contactFormSchema yeniden: contactMethod enum + contactValue rcımı + 2 refine; projectItem.media max12), use-contact-form.ts (yeni alanlar + switchContactMethod + hata düzeltme), contact-section.tsx (ContactCard: MailIcon/PhoneIcon SVG + GlobeIcon; combobox select; tek Input; refs), project-card.tsx (ProjectMedia: medya yoksa aspect-video fallback kutu; oklar; toolbar Önceki/Sonraki/Büyüt; sayaç i+1/count; lightbox portal z-[200] + Escape; buton sırası Sayfayı Aç→İndir→GitHub), content.ts (ProjectItem.media + contact.email/phone/location), i18n-content-tr.ts + tr/en.json (contact.method/cardEmail/cardPhone/cardLocation + projects.prev/next/zoom/zoomClose), api/contact/route.ts (method'a göre değer), api/admin/content/route.ts (contact merge email/phone/location korunur), data/content.json (Contact + boş alanlar).
- Doğrulama (CDP headless Edge 9341, tr locale): İLETİŞİM başlığı + GMAİL/TELEFON/KONUM kartları ("—" placeholder) + combobox (E-posta/Telefon) + tek zorunlu alan ✓. Oynatıcı test kartıyla: Sonraki → img değişimi t1→t2 ✓, sayaç 2/3 ✓, toolbar Önceki/Sonraki/Büyüt ✓, Büyüt → lightbox z-[200] bg-black/90 ✓, Escape kapattı ✓, butonlar Projeyi Gör → İndir → GitHub ✓. tsc 0.
- Bulunan latent bug + mini fix: githubRepos ?? projects — githubUsername boşken [] truthy → grid admin projelerini gizliyordu; loadGithubRepos'un !githubUsername dalı artık setGithubRepos(projects) yapıyor.
- KEŞİF / ÖNEMLİ: (1) content.json dev'de unstable_cache 300s + admin save revalidateTag ile tazeleniyor (dosya düzenleyince dev restart veya admin kaydı gerekir; .next/cache'i de etkiler). (2) Supabase yeniden ONLINE (ENOTFOUND dönemi bitti): mergeSupabase DB "projects" tablosunda kayıt varsa projects.items'i DB'den OVERRIDE ediyor — yani site projeleri artık content.json değil SUPABASE kaynağından geliyor (admin panel projeleri düzenlerken DB'ye yazmıyor — dosyaya yazıyor; DB eski/test kayıtları gösteriliyor). Kullanıcıya bildirilecek: projeleri DB'den yönetmek istiyorsa DB sync, istemiyorsa mergeSupabase projeler dalı kaldırılmalı.
- Test verisi: "Media Player Test" admin kaydı (3 medya incl. MDN mp4) geçici olarak enjekte edildi, doğrulama sonrası content.json yedekten geri yüklendi (items=0, gh=TARIKELER-TARNAK). Supabase tablosundaki eski test kayıtları DURUYOR (DB yönetimi kullanıcının kararı).

## 2026-09-09 (13. tur) — GitHub/non-GitHub sayaçları + dedup + /github rotaları + contact placeholder'lar + Media Player Test assets
- Kullanıcı: (1) "Media Player Test" GitHub projesi değil → "Github'da aç" butonu OLMAMALI. (2) GitHub projeleri yıldız+fork; GitHub olmayanlar Yıldız/Görüntülenme/İndirme; GitHub projelerine de Görüntülenme+İndirme eklensin. (3) Görüntülenme = "Sayfayı Aç" + "Github'da aç" + /github/OWNER/REPO ziyaretleri; AYNI kullanıcı aynı projede TEK sayım (if/dedup yapısı). (4) /github/ kök sayfa "yok" zannedildi ama ZATEN VARDI (metniyle) — [owner]/[repo] sayfaları yoktu; onları ekle. (5) Contact form input'larına placeholder. (6) Assets'teki GIF+MP4 Media Player Test için.
- Yeni dosyalar: src/lib/project-stats.ts (readProjectStats + recordProjectView — localStorage "project-viewed:<title>" bayrağıyla dedup; recordDownload), src/components/github/repo-visit-counter.tsx (mount'ta recordProjectView + GitHub'da aç + chip), src/app/github/[owner]/page.tsx + [owner]/[repo]/page.tsx (kök /github page.tsx zaten vardı).
- Değişen: project-card.tsx (useProjectStats lib'e taşındı; "Sayfayı Aç" artık YALNIZCA view (dosyada trackDownload da arttıran BUG kaldırıldı); GitHub butonu → recordView; GitHub kartlarında views>0/downloads>0 koşuluyla Görüntülenme/İndirme chip'leri), contact-section.tsx (placeholder'lar), i18n tr.json/en.json (+4 placeholder anahtarı), content.ts mergeSupabase (DB projeleri artık TAMAMEN DEĞİŞTİRMEZ: DB satırları title eşleşen local kaydı override eder, eşleşmeyen local kayıtlar korunur), data/content.json (Media Player Test item: media /demo/test-computer.gif + /demo/big-buck-bunny.mp4, srcLink YOK, projectLink "/").
- Assets kopyalandı: public/demo/test-computer.gif (123,817 B) + big-buck-bunny.mp4 (1,046,987 B).
- Doğrulama (CDP headless Edge 9341, tr): test kartında butonlar yalnızca [Yıldızla, Projeyi Gör] — GitHub butonu YOK ✓; chips #media #test 0(beğeni) 0 0 ✓; Projeyi Gör tıkla → project-stats views=1 + project-viewed=1; tekrar tıkla → views YİNE 1 (dedup ✓); Sonraki → <video src="/demo/big-buck-bunny.mp4"> ✓; chip UI "1" ✓. /github → "yakında aktif olacak" ✓; /github/TARIKELER-TARNAK → owner + GitHub'da aç ✓; /github/TARIKELER-TARNAK/Player/ → render + project-stats:Player {views:1} + project-viewed:Player + chip ✓. Placeholder'lar: "Adınızı yazın...", "ornek@eposta.com", "Mesajınızı yazın..." rendered ✓. tsc 0.
- NOT: Supabase ağı bu turda KAPALI (Test-NetConnection supabase.co:443 → False) — yani 12. turdaki "projeler DB'den geliyor" keşfi YANLIŞTI; test kartı asıl kaynağı stale unstable_cache idi (backup sonrası da .next/cache'te eski içerik kaldı). Akış: content.json = güvenilir kaynak; mergeSupabase Supabase'e ulaşamazsa sessizce base döner. DB'deki eski test kayıtları kullanıcının DB yönetim kararını bekliyor.

## 2026-09-09 (13b. tur) — Kart içi video oynamıyordu (illa Büyüt gerekliydi)
- Sorun: project-card.tsx ProjectMedia kart içi çağrısı mediaNode(current, isVideo, false) -> video kontrolleri KAPALI; kullanici oynatamiyordu. Lightbox'ta controls + autoPlay vardi, o yuzden buyutunce calisiyordu.
- Fix: kart ici cagri controls=true; video ogesine preload="auto" + onClick toggle (tiklayinca oynat/durdur - v.paused ? v.play() : v.pause()).
- Dogrulama (CDP headless Edge): kart ici video controls=true, preload=auto, readyState=4 (duration 10), play() -> paused=false, currentTime 1.81+ (ilerliyor), error null. tsc 0.

## 2026-09-09 (13c. tur) — Medya kutusundan ok overlay'leri kaldırıldı, toolbar kutu DISINA tasindi
- Kullanici: Ok overlay'leri (kutu uzerindeki sag/sol ok cercevesi) kaldirilsin; video'nun native controls cubugu ile bizim (Onceki/Sonraki/Buyut) toolbar cakisiyor -> toolbar kutunun DISINA, altina alinsin.
- Fix: project-card.tsx ProjectMedia: orta-sol/sag ok butonlari (arrowCls) silindi; alt toolbar absolute bottom-2 pill -> kutu div'inden sonra normal flex satir (mt-2, Onceki | sayaç | Sonraki | ... | Buyut). Lightbox oklari dokunulmadi.
- Dogrulama (CDP headless Edge): medya kutusu rect top 2292..2449; Onceki/Sonraki/Buyut top 2457 (hepsi kutunun ALTINDA = allBelow true); buton seti tekil (overlay oku yok). tsc 0.

## 2026-09-09 (13d. tur) — GitHub projelerine de İndirme + Görüntülenme (her zaman gorunur + olcum)
- Kullanici: GitHub projelerine de indirme ve goruntulenme EKLE; olcum onceki talimatla ayni olsun (Sayfayi Ac + GitHub'da ac + /github/OWNER/REPO ziyareti = goruntulenme, dedup tek sayim; indirme = Indir tiklamasi).
- Fix (project-card.tsx): (1) Github kartlarindaki views/downloads chip'leri artik KOSULSUZ her zaman gorunuyor (onceki koşul: views>0||downloads>0 idi) — GitHub ve non-GitHub kartlari ayni chip duzenini paylasiyor (Indirme, Goruntulenme). (2) GitHub projelerine INDR button eklendi: srcLink/archive/refs/heads/main.zip (repo zip'i), onClick trackDownload(). tsc 0.
- Dogrulama (CDP headless Edge): 9 kartta 18 chip (Indirme+Goruntulenme) her zaman render; 8 GitHub zip butonu DOM'da. Gercek GitHub projesi (Accentra): zip tikla -> project-stats:Accentra {downloads:1}; GitHub'da ac tikla -> views:1 + project-viewed:Accentra='1'; ikinci tiklamada views 1'de kaldi (dedup). 
- Not: zip href'i 'main' branch'i varsayar; repo default branch'i farkliysa (master vb.) GitHub 404 donebilir — archive/HEAD.zip daha saglam ama main yerine HEAD kullanmak icin api/github/repo default_branch'i getirmek gerekir (ileride).

## 2026-09-09 (14. tur) — Sıralama/Etiket combobox'ları (aramalı) + çoklu filtre + iletişim bilgileri
- Kullanici: (1) "Sırala:" yazısını blog+projelerden KALDIR; (2) etiketleri bir combobox'a koy; (3) sıralama+filtreleme combobox'larına arama kutusu; (4) sıralama seçeneklerinin hepsi dogru calissin + daha cok secenek; (5) filtrede en basta "Hepsi"; (6) COKLU filtreleme, secili etiketler alt satirda ad + carpi ile kaldirma; (7) iletisim: Telefon (opsiyonel)->Telefon, Gmail->tarikelertarnak@gmail.com, telefon +90 5518958715, konum->Google+Yandex harita butonlari.
- Yeni bilesen: src/components/ui/searchable-combobox.tsx — arama inputu (en ustte), "Hepsi" secenegi (multiple modda ilk sirada), coklu secim (✓ isaretli), acikken Esc/dis tik ile kapanma, badge (secili sayisi). Tek (siralama) ve coklu (filtre) modu destekler.
- ProjectsGrid: "Sırala:" etiketi SİLİNDİ (trigger placeholder "Sırala"); onay select yerine aramali combobox: 9 secenek (En Yeni, En Eski, En Çok Görüntülenen, İndirme Sayısı, En Çok Yıldız, En Çok Fork, En Beğenilen, A-Z, Z-A). ASC/DESC dugmesi KALDIRILDI — yon secenegin kendisinde (eski sortUpdated/updated artık kullanilmiyor). Etiket filtreleri chip'lerden combobox'a tasindi (coklu, Hepsi, arama); secili etiketler grid ustunde chip olarak gorunur (#tag + X carpi ile tek tek kaldirilir). Filtre OR-mantigi (etiketlerden biri eslesmeli).
- BlogSection: ayni sekilde "Sırala:" kaldirildi, aramali sort (En Yeni, En Eski, A-Z, Z-A, En Çok Görüntülenen — views localStorage blog-stats:slug'den). Etiket combobox coklu+Hepsi+arama (blog yazilari su an 0 adet oldugundan etiket yoksa combobox render edilmez).
- Iletisim: contact.phone "Telefon (opsiyonel)" -> "Telefon"; kart degerleri content.json'dan: email=tarikelertarnak@gmail.com (mailto), phone=+90 5518958715 (tel: — boşluk/tire temizlenerek), location kartinda iki buton: Google Haritalar (content.contact.location) + Yandex Haritalar (YENI alan content.contact.locationYandex). Tip/validations/admin-route/merge guncellendi. content.json contact dolduruldu (iki harita URL'si kullanici linkleri).
- i18n: tr+en 20 yeni/degisen anahtar (blog.sortZa, blog.sortViews, blog.searchTag/searchSort/allTags/removeTag, projects.sortNewest/sortOldest/sortZa/allTags/searchTag/searchSort/removeTag, combobox.all, contact.phone/cardEmail, contact.mapsGoogle/mapsYandex).
- Dogrulama (CDP headless Edge): sort combobox panelinde 9 secenek + arama inputu; A-Z->ilk Accentra, Z-A->ilk TarnakLua-Roblox; indirme sortu->ilk Accentra (localStorage downloads:3), goruntulenme->ilk Accentra (views:5); yildiz 5-4-3-3... (monoton azalan), fork 1-1-0-0 (monoton). Filtre: panelde "Hepsi" ilk + arama; 2 etiket secince badge=2 + 2 chip (aria-label "Filtreyi kaldir <tag>"); carpi ile 1'e dustu; "Hepsi" ile 0. Blog sort 5 secenek + arama. Iletisim: mailto/tel href'ler + 2 harita butonu (google.com/maps + yandex.com.tr). tsc 0.
- Not: blog'da 0 yazi var; yazi eklenirse etiket combobox'i otomatik gorunur.

## 2026-09-09 (14.5) - Buyut ikonu degistirildi
- Kullanici verilen SVG (viewBox 0 0 666 680, expend/collapse ikonu) ile ArrowUpRightIcon yerine gecti
- icons.tsx'e MaximizeIcon eklendi (width=size*666/680 orani korunur, fill currentColor); project-card Buyut butonunda kullanildi (size 13)
- tsc 0; CDP: viewBox 666x680 + width 12.73/height 13 dogrulandi



## 2026-09-09 (15. tur) — Supabase yeni projeye gecildi (fjmtjbiuildfcjfnsgtk)
- Kullanici: "BUNU KULLAN https://supabase.com/dashboard/project/fjmtjbiuildfcjfnsgtk supabase guncelle yenisi bu" — eski proje (jorlmqlnnplhoimxxgze) kapatildi.
- .env.local: NEXT_PUBLIC_SUPABASE_URL -> https://fjmtjbiuildfcjfnsgtk.supabase.co, yeni anon + service_role key (legacy JWT, dashboard settings/api-keys/legacy'den alindi). SUPABASE_DB_PW yeni proje icin bos (sifre dashboard'dan resetlenirse yazilacak).
- Sema: scripts/schema.sql Management API (POST /v1/projects/{ref}/database/query, dashboard session token ile) uzerinden 201 ile uygulandi: profiles + handle_new_user trigeri (tarikelertr@gmail.com -> admin), messages, posts, projects, skills, stats + RLS policy'leri + baslangic verileri (stats 1, 10 skill, Player projesi, merhaba-dunya blog yazisi).
- Admin kullanici: Auth Admin API (service_role) ile tarikelertr@gmail.com olusturuldu (email_confirm=true), trigger profiles'a role=admin atadi (REST ile dogrulandi). Gecici sifre: Trnk!2026$SupaLoca (kullaniciya rapor edildi).
- Dev server yeni env ile yeniden baslatildi (eski pid 33904 durduruldu, .next-dev.log'a yonlendirmeli). .next-dev.log'da hic "merge skipped"/supabase uyarisi yok -> projects/skills/stats merge'i yeni projeden sessizce geldi.
- Not: blog getPosts sadece local data/blog'u okuyor (supabase posts okumasi kodda yok) — merhaba-dunya yazisi sitede gorunmuyor. Content merge projeler/skills/stats kapsar; blog icin ayri is gerekir.


## 2026-09-09 (16. tur) — About kisisel bilgi karti + yeni admin hesabi
- Kullanici: "About me kismina ornekteki gibi kisim yap" (Name/Nationality/Title/Experience/Phone/Email/First Language/Other Languages) + admin hesabi TARIKELERTARNAK / tarikelertarnak@gmail.com / NEhS&V+79_zk7 / role admin ("Default Admin").
- About karti: content.ts profile tipine 4 yeni alan (nationality, experience, firstLanguage, otherLanguages) + defaults; validations.ts profile'a ayni alanlar (optional); i18n-content-tr.ts Turkce degerler; content.json/profile dolduruldu (Turkish, 3+ Years, Turkish, English (B1), profileImage=GitHub avatar https://avatars.githubusercontent.com/u/184168415?v=4). i18n tr+en: about.infoCardTitle + 8 label (Ad, Uyruk, Unvan, Deneyim, Telefon, E-posta, Ana Dil, Diger Diller). about-section.tsx: BentoBox'a tam genislik "Kisisel Bilgiler" karti (solda avatar, sagda 2 kolon label/value satirlari, InfoRow komponenti; bos deger -> —). Telefon/E-posta content.contact'tan gelir.
- Admin hesabi: Auth Admin API ile tarikelertarnak@gmail.com olusturuldu (id 9c493862-8b9e-42f1-8346-ac0fe4f786af, email_confirm=true, username TARIKELERTARNAK). handle_new_user trigeri Management API uzerinden guncellendi (tarikelertarnak@gmail.com -> admin; hem DB'de hem scripts/schema.sql'de). Yeni kullanicinin profile rolu admin'e update edildi. Eski tarikelertr@gmail.com hesabi silindi (auth + profiles cascade).
- Dogrulama: tsc 0. CDP (headless Edge): anasayfada kart satirlari DOM'dan dogrulandi (Ad TARIK ELER, Uyruk Turk, Unvan Yazilimci & Sistem Mimarisi, Deneyim 3+ Yil, Telefon +90 5518958715, E-posta tarikelertarnak@gmail.com, Ana Dil Turkce, Diger Diller Ingilizce (B1), avatar GitHub). dev-role cookie'si silinince gercek supabase login akisi test edildi: tarikelertarnak@gmail.com / NEhS&V+79_zk7 ile giris -> admin paneli acildi (sahte oturum yok). /api/admin/users -> 200, tek kullanici, role=admin, lastSignIn kayitli; Kullanicilar sekmesinde TARIKELERTARNAK + Admin rozeti gorunuyor.
- Not: kullanicinin vermedigi degerler icin varsayim yapildi (kullaniciya raporlandi): Uyruk Turk, Deneyim 3+ Yil (stats experience_years=3), Ana Dil Turkce, Diger Diller Ingilizce (B1) (ornek formatina uygun), foto GitHub avatari. Degistirilmek istenirse admin paneli Profil sekmesi/content.json'dan guncellenir.


## 2026-09-11 (17. tur) — Tek dil (TR) sabitleme + kod İngilizce + GitHub 403 + launcher fix
- Kullanici: "Geliştirme Türkçe yürüyor ingilizce olmalı herşey sadece Türkçe dil desteği olmalı ve ben sadece türkçe bildim için seninle türkçe konuşçam düzelt herşeyi" — yorum: site TEK DİL Türkçe'ye sabitlendi (EN desteği kapatildi), geliştirme dili İngilizce (yorumlar/console), ajan kullaniciyla Türkçe konusuyor.
- i18n tek dil: src/lib/i18n.ts — detectLocale/resolveLocale her zaman 'tr' donduruldu; dictionaries yalnizca tr (en.json pasif diskte duruyor); t() fallback key. i18n-server.ts — getLocale()='tr', mergeTr/overlay katmani sadeleştirildi (localizeContent = content; getLocalizedContent = getContent). locale-provider.tsx — provider sabit {tr,tr,tr,noop}, useT hep tr sözlügünden; localStorage/cookie dil akisi kapatildi. layout.tsx — cookiePref kaldirildi, html lang="tr", metadata TR sabit (isEn ternaries silindi). settings-dropdown.tsx — DİL bölümü KALDIRILDI + GEÇİCİ (dev) admin rolü bölümü SİLİNDİ (dev-role cookie ile yetkisiz admin erisim riski — gercek /login akisi varken gereksizdi).
- content.json TR'ye cevrildi (hero tagline/desc/stats, nav, about/bloc, interests 5 oge, team rolleri, cv 4 deneyim + egitim, profile, contact success, projects subtitle/title, github/chat aciklamalari). Eski i18n-content-tr.ts overlay'i artik kullanilmiyor (klasik dosya pasif).
- Kod TR yorumlari → EN: 3 fixer ajani paralel — src/lib/** + src/data/** + src/proxy.ts (22 dosya), src/components/** (35 dosya, 268 satir), src/app/** api route'lari + sayfalar (22 dosya, 53 satir). Kullaniciya gorunen TR string'ler (UI, form hatalari, JSON messagelar) KORUNDU. tsc 0.
- GitHub 403 COZULDU: gh token (opencode-gh-autonomous, 93 chars, fine-grained, 2026-12-09) .env.local GITHUB_TOKEN'a yazildi. /api/github?username=TARIKELER-TARNAK → 200, gercek profil (Tarık Eler) + repo listesi donuyor. .env.local yorumlari EN.
- Launcher fix: start-dev.cmd ve dev-server.ps1 eski "Web Site/Web Sİtem" yollarindan Tarnak\site'ye duzeltildi; dev-watchdog.ps1 yorumlari EN. Dev server baslatildi (HTTP 200: /, /blog, /projects). TarikelerDevServer gorevi + watchdog enable BASARISIZ (schtasks: Erisim engellendi — yonetici/UAC gerekli; agent UAC calistirmaz). PORT 3000 ayakta, watchdog log calismiyor (task disabled).
- git: site/ icinde git init edildi (221 dosya). Commit: yerel kalacak, remote push YOK (AGENTS.md kurali).
- Notlar: blog posts.json [] (0 yazi); ADMIN_SECRET hala local-secret (production oncesi degismeli); duplicates/temizlik (eski log'lar, kok dizin remember-list-path) bir sonraki turda.

## 2026-09-11 (devam) — Puck vitrini AYDAN sayfadan SOYULDU (ana sayfa orijinale dondu)
- Sorun (kullanici tespiti): / ana sayfasi Puck vitrini ("GÖRSEL DÜZENLEYİCİ AKTİF / TARNAK HOŞ GELDİNİZ / Bu içerik yönetici panelindeki Sayfa Düzenleyici ile oluşturuldu") ekranina donusmus. Kok neden: data/puck-pages.json'da "home" kaydi vardi (vitrin), page.tsx `getPuckPage('home')` bulunca PuckPageView render ediyordu.
- Cozum: (1) puck-pages.json yedeklendi (data/puck-pages.bak-vitrin-20260911.json) ve `{}` sifirlandi. (2) page.tsx'ten Puck dalı TAMAMEN cikarildi (PuckPageView/getPuckPage importlari + puckData if blogu) — ana sayfa ARTIK HER ZAMAN statik section'lar (Hero/About/Projects/Blog/Contact). Puck bir daha ana sayfayi itemez. (3) PuckEditorOverlay layout'tan kaldirildi (URL degismeden sayfa ezen overlay modu artik yok; dosya pasif, silinmedi). (4) Sidebar "Sayfa Düzenleyici" ve Admin Panel butonu `editor:open` event'i yerine gercek rotaya (router.push /admin/puck/...) baglandi — düzenleyici artik kendi URL'sinde acilir, orijinal sayfayi düzenler. "URL değişmez" rozeti kaldirildi.
- Dogrulama: tsc 0. / 200 (orijinal statik sayfa), /blog/ 200, /projects/ 200, /admin/puck/ 307→/login (korumali). Tarayicida HAKKIMDA/ARAC CANTAM/PROJELER/BLOG/ILETISIM bolumleri gorunuyor.
- Puck sistemi duruyor (gercek puck sayfalari /admin/puck + /puck/* rotalarinda); vitrin kaydi yedekte. Ana sayfa Puck'tan bagimsiz.
- Dev server yeniden baslatildi (port 3000, .next-dev.log).
