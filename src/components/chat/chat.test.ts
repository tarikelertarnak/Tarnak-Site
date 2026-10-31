import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Chat arayüz kaynak-sözleşmesi (2026-10-11).
 *
 * Kullanıcı isteği çok geniş (WhatsApp benzeri). Bu test, istendiği halde
 * kolayca sessizce kaybolabilecek kritik davranışların KAYNAKTA bulunduğunu
 * garanti eder:
 *   · tikler: sarı = görülmedi (gönderildi/teslim), yeşil = okundu —
 *     ikon + renk kararı `lib/chat-ticks.ts` (Material Symbols Rounded)
 *   · sağ tık → bilgi / sabitle / kopyala / sil menüsü
 *   · "Mesaj silinsin mi?" → Herkesten sil · Benden sil · İptal
 *   · yanıt (reply) akışı
 *   · silinen mesaj "Bu mesajı sildiniz" notu (içerik sunucuda maskeli)
 *   · emoji + dosya/görsel/ses/video gönderimi
 *
 * Render testi yerine kaynak sözleşmesi: bileşen ağır (fetch + polling +
 * kullanıcı etkileşimi), sözleşme testi deterministik ve hızlıdır.
 * (Repo deseni: no-hash-links.test.ts, vcard-qr-only.test.ts.)
 */
const SRC = readFileSync(
  join(process.cwd(), 'src/components/chat/chat.tsx'),
  'utf8',
)

/**
 * YORUMSUZ kaynak. Negatif iddialar (`not.toContain`) için ŞART: dosyadaki
 * gerekçe yorumları kaldırılan kodu adıyla anar ("eskiden `menuPeer` idi"),
 * ham metinde arayınca yanlış pozitif verir.
 */
const CODE = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')

describe('chat arayüz sözleşmesi', () => {
  it('tik: gönderildi/iletildi → soluk gri, okundu → mavi; yeşil/sarı YOK', () => {
    // İkon + renk kararı saf modülde (chat-ticks.test.ts onu tek tek doğrular);
    // bileşenin işi yalnızca o kararı render etmek.
    expect(SRC).toMatch(/import \{[^}]*TickReadIcon[^}]*TickSentIcon[^}]*\} from '@\/components\/ui\/icons'/)
    expect(SRC).toContain('tickFor(m, { pending: m._pending, failed: m._failed, selfChat })')
    // saat = gönderiliyor; çift tik = okundu, tek tik = gönderildi/iletildi
    expect(SRC).toMatch(/m\._pending\s*\? <ClockIcon/)
    expect(SRC).toMatch(/tick\.double \? <TickReadIcon[^>]*\/> : <TickSentIcon/)
    expect(SRC).toMatch(/className=\{cn\('inline-flex shrink-0', tick\.color\)\}/)
    // Renk bileşende SABİT yazılmaz (tek kaynak lib/chat-ticks.ts): sarı/yeşil
    // hiç yok. Amber/yeşil ailesi YALNIZ alıntı şeridi paletinde (QUOTE_ACCENTS)
    // geçebilir — o blok ayrı tutulup geri kalan kaynakta aranır (2026-10-16).
    const withoutPalette = CODE.replace(/QUOTE_ACCENTS = \[[\s\S]*?\n\]/, '')
    expect(withoutPalette).not.toMatch(/text-(amber|green|yellow)-\d/)
    // Iconify'a dönüş yok: tikler inline SVG (boş ikon sorununa karşı) ve
    // her mesajda ağdan çekilmez.
    expect(SRC).not.toContain('@iconify/react')
    // Eski metin glifi kalmadı (kullanıcı "çok kötü" dedi).
    expect(SRC).not.toContain('✓✓')
  })

  it('tik ikonları `components/ui/icons.tsx`te inline tanımlı', () => {
    const ICONS = readFileSync(
      join(process.cwd(), 'src/components/ui/icons.tsx'),
      'utf8',
    )
    expect(ICONS).toContain('export function TickSentIcon')
    expect(ICONS).toContain('export function TickReadIcon')
  })

  it('mesaja sağ tık menüsü açılır (onContextMenu)', () => {
    expect(SRC).toContain('onContextMenu')
  })

  it('silme onayı: "Herkesten sil" · "Benden sil" · "İptal" akışı', () => {
    // modal başlığı + üç buton
    expect(SRC).toContain('deleteConfirmTitle')
    expect(SRC).toContain('deleteForAll')
    expect(SRC).toContain('deleteForMe')
    expect(SRC).toContain('cancel')
    // mode: 'all' | 'me'
    expect(SRC).toMatch(/remove\('all'\)|remove\("all"\)/)
    expect(SRC).toMatch(/remove\('me'\)|remove\("me"\)/)
  })

  it('yanıt (reply) akışı: önizleme + kaynak mesaja gitme', () => {
    expect(SRC).toContain('setReplyTo')
    expect(SRC).toContain('replyToId')
    // Giriş üstü önizleme çubuğu ve balon içi alıntı bloğu AYNI kaynaktan
    // beslenir (`replyLive` → sunucudan gelen `reply_to` özeti).
    expect(SRC).toContain('const replyLive = useMemo(')
    expect(SRC).toContain('quoteAccent(')
    expect(SRC).toContain('data-testid="chat-reply-preview"')
    // kaynak mesaja kaydırma — MESAJ ALANI içinde (`scrollIntoView` ataları
    // (sayfayı da) kaydırdığı için 2026-10-13'te kaldırıldı). 2026-10-16:
    // `scrollToMessage` → `jumpToMessage` oldu (kaydırma + vurgu flash'ı).
    expect(SRC).toMatch(/function jumpToMessage\(id: string\)/)
    // her mesaj çapalanabilir olsun
    expect(SRC).toMatch(/id=\{`msg-\$\{m\.id\}`\}/)
  })

  it('sabitlenen mesaj 📌 ile işaretlenir; herkes sabitleyebilir', () => {
    expect(SRC).toContain('📌')
    expect(SRC).toMatch(/act\('pin'/)
  })

  it('silinen mesaj "Bu mesajı sildiniz" notu gösterir (içerik sızmaz)', () => {
    expect(SRC).toContain('deletedByYou')
    expect(SRC).toMatch(/deleted_for_all/)
  })

  it('emoji seçici ve dosya/görsel/ses/video gönderimi', () => {
    // 2026-10-12: 16 emojili şerit yerine `emoji-picker-element` (aramalı,
    // kaydırılabilir, koyu tema). Emoji İMLECİN olduğu yere eklenir.
    expect(SRC).toContain('<EmojiPicker')
    expect(SRC).toContain('insertEmoji')
    expect(SRC).not.toContain('EMOJIS')
    expect(SRC).toContain('uploadFile')
    // tür bazlı render
    expect(SRC).toMatch(/kind === 'image'/)
    expect(SRC).toMatch(/kind === 'audio'/)
    expect(SRC).toMatch(/kind === 'video'/)
  })

  it('emoji seçici sitenin dilini ve koyu temayı alır, dışa tıklama/Esc kapatır', () => {
    const PICKER = readFileSync(
      join(process.cwd(), 'src/components/chat/emoji-picker.tsx'),
      'utf8',
    )
    // Kütüphane YALNIZ istemcide: customElements sunucuda yok.
    expect(PICKER).toMatch(/await import\('emoji-picker-element'\)/)
    expect(PICKER).toContain('dataSource')
    // Veri kaynağı: resmî CDN (5 dil) + yerelde üretilmiş dosyalar (tr/de/es/pt/ar).
    expect(PICKER).toContain('emoji-picker-element-data')
    expect(PICKER).toContain('/emoji-data/')
    expect(PICKER).toContain('resolveDataSource')
    // Arayüz etiketleri sitenin dilinde; TR çevirisi kütüphanede VAR.
    expect(PICKER).toMatch(/tr: \(\) => import\('emoji-picker-element\/i18n\/tr'\)/)
    expect(PICKER).toMatch(/setAttribute\('class', 'dark'\)/)
    expect(PICKER).toContain('emoji-click')
    expect(PICKER).toContain('Escape')
    // Boyut (genişlik/sütun/yükseklik) tek kaynaktan: globals.css.
    const CSS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
    const block = CSS.slice(
      CSS.indexOf('.emoji-picker-host emoji-picker'),
      CSS.indexOf('/* ---------- Marquee ----------'),
    )
    expect(block, 'kütüphanenin width:min-content kuralı ezilir').toContain('width: 100%')
    expect(block).toContain('height: min(350px, 45svh)')
    expect(block).toContain('--num-columns: 8')
    expect(block, 'mavi odak çerçevesi inceltildi').toContain('--outline-size: 1px')
    expect(block).toContain('@media (min-width: 480px)')
    expect(block).toContain('@media (min-width: 768px)')
  })

  it('yazma durumu: sarı nokta yok, mavi "@kullanıcı yazıyor…" metni var', () => {
    // Nokta yalnız yeşil/kırmızı (saf mantık `lib/chat-peers.ts`).
    expect(SRC).toContain('typingLabel')
    expect(SRC).toContain('isTyping')
    expect(SRC).toMatch(/text-primary">\s*\{typingLabel/)
    // Yazma sinyali: throttle (2 sn) + debounce (2.5 sn) + TTL.
    expect(SRC).toContain('TYPING_THROTTLE_MS')
    expect(SRC).toContain('TYPING_IDLE_MS')
    expect(SRC).toContain('signalTyping')
  })

  it('boş sohbetteki "Merhaba de!" TIKLANABİLİR ve selamlama dile göre', () => {
    expect(SRC).toContain('helloMessage')
    // Gönderim SÜRERKEN kilit: çift tıklamada iki mesaj gitmez.
    expect(SRC).toMatch(/disabled=\{sending\}/)
    // Sarı/yeşil uyarı tonu YOK (tek istisna alıntı şeridi paleti).
    const withoutPalette = CODE.replace(/QUOTE_ACCENTS = \[[\s\S]*?\n\]/, '')
    expect(withoutPalette).not.toMatch(/text-amber/)
  })

  it('mesaj bilgisi paneli: Okundu · Teslim edildi · Tarih', () => {
    expect(SRC).toContain('MessageInfo')
    expect(SRC).toContain('readAt')
    expect(SRC).toContain('deliveredAt')
    // tarih GG.AA.YYYY
    expect(SRC).toMatch(/toLocaleDateString\('tr-TR'/)
  })

  it('önemli kişi işareti sağ tık menüsünden API\'ye bildirilir', () => {
    // 2026-10-13: başlıktaki ⚪/🔴 düğmesi kaldırıldı → işaret hâlâ `important`
    // bayrağına yazılır, ama karar PeerMenu'de (sağ tık) verilir.
    expect(SRC).toContain('onToggle(\'important\'')
    // 2026-10-13 (#2): menü imleç konumunda açıldığı için hedef kişi `menu.peer`
    // üzerinden gelir (eskiden doğrudan `p` idi).
    expect(SRC).toContain('runAdmin(action, peer, { [action]: next })')
    expect(SRC).toContain('action === \'favorite\' || action === \'important\' || action === \'block\'')
  })

  it('giriş yoksa mesaj gönderilmez (API 401) — UI kilitli', () => {
    expect(SRC).toContain('loginRequired')
    expect(SRC).toContain('isAuthenticated')
  })

  /*
    REGRESYON (2026-10-11): "Sohbete girmek için giriş yap." GİRİŞ YAPMIŞKEN
    çıkıyordu. Ölçülen kök neden: root layout `dynamic = 'force-static'`
    (layout.tsx:58) → Next alt rotalarda `cookies()`'ı BOŞ döndürüyor, yani
    sunucudaki getSessionUser() daima null dönüyordu. Route handler'lar layout
    DIŞINDA olduğu için /api/admin/session aynı çerezi doğru okuyordu.
  */
  describe('oturum İSTEMCİDE çözülür (force-static tuzağı)', () => {
    const PAGE = readFileSync(
      join(process.cwd(), 'src/app/chat/page.tsx'),
      'utf8',
    )

    it('/chat sayfası oturumu SUNUCUDA okumaz', () => {
      // Sunucu tarafı okuma her zaman null döndürüyordu; tamamen kaldırıldı.
      // (Yorumlarda geçebilir; önemli olan import + çağrı.)
      expect(PAGE).not.toMatch(/^import \{[^}]*getSessionUser/m)
      expect(PAGE).not.toMatch(/await getSessionUser\(/)
      expect(PAGE).not.toContain('supabase/session')
    })

    it('bileşen oturumu /api/admin/session üzerinden okur', () => {
      expect(SRC).toContain('/api/admin/session')
      // layout dışında olduğu için çerezi doğru okuyan yol
      expect(SRC).toMatch(/action:\s*'open'/)
    })

    it('giriş yapmamış kullanıcıya iki buton verir: Kayıt ol + Giriş yap', () => {
      expect(SRC).toContain('chat.registerBtn')
      expect(SRC).toContain('chat.loginBtn')
      // her ikisi de next ile (giriş sonrası sohbete dönüş)
      expect(SRC).toMatch(/\/sign\?next=/)
      expect(SRC).toMatch(/\/login\?next=/)
    })

    it('/login ve /sign sayfaları ?next= destekler', () => {
      // 2026-10-20: `?next=` çözümü sayfa gövdesinden `AuthForm`'a taşındı
      // (sayfalar artık `<AuthForm mode=… />` render ediyor). Davranış aynı:
      // güvenli yerel yol çözülür, dış/kök değer `/`'a düşer. Sözleşmeyi
      // davranışın SAHİBİ olan bileşende doğruluyoruz.
      const form = readFileSync(
        join(process.cwd(), 'src/components/auth/auth-form.tsx'),
        'utf8',
      )
      for (const page of ['login', 'sign']) {
        const src = readFileSync(
          join(process.cwd(), `src/app/${page}/page.tsx`),
          'utf8',
        )
        expect(src).toContain('<AuthForm')
      }
      expect(form).toContain('useSearchParams')
      expect(form).toContain('searchParams.get(\'next\')')
      expect(form).toMatch(/startsWith\('\/'\) && !rawNext\.startsWith\('\/\/'\)/)
    })
  })

  /*
    YERLEŞİM SÖZLEŞMESİ (2026-10-12 kullanıcı isteği):
    "önce kime yazacağımızı seçiyoruz sonra onunla sohbet açılıyor — yanlış;
     ikisi yan yana tek bir hâlde olacak. Yan panel gibi duracak, büyütüp
     küçültebileceğim. 'Kime yazmak istiyorsun?' yazısını kaldır, sohbet tam
     ekranı kaplasın." "Sohbet yükleniyor" ekranı da kalktı (iskelet oldu).
  */
  describe('tek ekran: solda kişi paneli (yeniden boyutlandırılabilir) + sağda sohbet', () => {
    it('"Kime yazmak istiyorsun?" başlığı ve eski seçim ekranı KALKTI', () => {
      expect(SRC).not.toContain('pickRecipient')
      expect(SRC).not.toMatch(/isAdmin && !conversationId/)
    })

    it('kişi paneli ve sohbet AYNI ekranda durur', () => {
      expect(SRC).toContain('<aside')
      expect(SRC).toContain('<section')
      // birden fazla kişi varsa sağ panel "soldan bir kişi seç" der
      expect(SRC).toContain('chat.selectPerson')
    })

    it('yan panel sürükleyerek VE klavyeyle yeniden boyutlandırılır', () => {
      expect(SRC).toContain('role="separator"')
      expect(SRC).toContain('startResize')
      expect(SRC).toContain('resizeByKey')
      expect(SRC).toContain('CHAT_PANEL_MIN')
      expect(SRC).toContain('CHAT_PANEL_MAX')
      expect(SRC).toMatch(/aria-orientation="vertical"/)
      // genişlik CSS değişkeniyle panele geçer — TÜM genişliklerde (2026-10-15:
      // mobilde de sürüklenebilir; eskiden `md:` önekiyle yalnız masada etkindi).
      expect(SRC).toContain('w-[var(--chat-panel-w)]')
      // tutamaç hiçbir koşulda gizlenmez (KOMPAKT modda da görünür).
      expect(SRC).not.toMatch(/separator[\s\S]{0,400}hidden/)
    })

    it('sohbet tam ekranı kaplar (eski 760px / 68svh / max-w-3xl sınırı yok)', () => {
      // 2026-10-13: başlık bloğu kalktı → ayrılan pay 19rem'den 11rem'e indi.
      // 2026-10-13 (#2, kullanıcı isteği): dar ekranda (<768px) kart TAM ekranı
      // kaplar; yüksekliği saran sayfa kutusu `dvh` ile verir.
      // ÖLÇÜLDÜ (2026-10-13, gerçek Chromium 390×780): `h-full` burada
      // ÇÖZÜLMÜYOR (slot yüksekliği `min-height`+`flex-1`'den geldiği için
      // "belirli" sayılmıyor) → kart `min-h-[260px]`'te kalıyordu. Doğrusu
      // yükseklik sınıfı KOYMAMAK: slotun `items-stretch`'i uzatır.
      // ÖLÇÜLDÜ (2026-10-13, gerçek Chromium 390×780, 24 mesaj): kartın
      // yüksekliği belirsizse (ne `h-full` ne sınıf) kaydırma kabı içerik boyuna
      // (1106px) çıkıyor, `overflow-y-auto` devre dışı kalıyor, yazma alanı
      // kartın dışına itilip `overflow-hidden` ile kırpılıyordu. Sabit `dvh`
      // yüksekliği şart; `h-full` (=height:100%) burada ÇÖZÜLMÜYOR.
      expect(SRC).toContain('h-[calc(100dvh-4.5rem)] min-h-[260px] w-full overflow-hidden')
      expect(SRC).not.toMatch(/className="[^"]*h-full min-h-\[260px\]/)
      expect(SRC).toContain('md:h-[calc(100svh-11rem)]')
      // sınıf listesinde eski sınırlar YOK (yorumda anılmaları serbest)
      expect(SRC).not.toMatch(/className="[^"]*max-h-\[760px\]/)
      expect(SRC).not.toMatch(/className="[^"]*68svh/)
    })

    it('bağlam menüleri sohbet panelinin DIŞINDA render edilir', () => {
      // ÖLÇÜLDÜ (2026-10-13, gerçek Chromium 390px): menüler `<section>` içinde
      // kalırsa, liste açıkken panel `hidden` olduğu için menü DOM'da olmasına
      // rağmen GÖRÜNMÜYOR (erişilebilirlik ağacına da girmiyor, `getByRole`
      // bulamıyordu) → mobilde uzun basma/menü bozuk görünüyordu.
      const sectionClose = SRC.indexOf('</section>')
      const asideClose = SRC.indexOf('</aside>')
      const menus = SRC.indexOf('BAĞLAM MENÜLERİ')
      expect(menus).toBeGreaterThan(0)
      expect(sectionClose).toBeGreaterThan(0)
      expect(asideClose).toBeGreaterThan(0)
      expect(menus).toBeGreaterThan(sectionClose)
      expect(menus).toBeGreaterThan(asideClose)
      expect(SRC.lastIndexOf('</section>')).toBe(sectionClose)
    })

    /*
      2026-10-13 (#2) KULLANICI İSTEKLERİ — kaynak sözleşmeleri.
      Hepsi canlı tarayıcıda `e2e/chat-fixes.spec.ts` ile de ölçülür; burada
      niyet kaynakta sabitlenir (yanlışlıkla geri alınmasın).
    */
    it('dar ekran yazma alanı: klavyeye/safe-area\'ya dayanıklı', () => {
      // Klavye açılınca taşmasın: giriş alanı küçülmez, alt güvenli alan kadar
      // içeriden boşluk bırakır.
      expect(SRC).toContain('shrink-0 border-t')
      expect(SRC).toContain('env(safe-area-inset-bottom)')
    })

    it('iki panel HER genişlikte yan yana; tam ekran liste kaplaması YOK', () => {
      // 2026-10-13 (SON istek): "Ekran ne kadar küçük olursa olsun geniş
      // ekrandaki iki panelli düzen korunsun … tam ekran liste görünümü
      // tamamen kaldırılsın." Yani: `md:hidden` kaplama, X kapatma ve
      // `absolute inset-0` yok.
      // 2026-10-15: mobilde de `--chat-panel-w` ile sürüklenebilir (eski
      // `clamp(72px,28vw,300px)` kaldırıldı — sürükleme mobilde çalışmıyordu).
      expect(SRC).not.toContain('absolute inset-0 z-40')
      expect(SRC).not.toContain('md:static')
      /*
        Genişlik INLINE (2026-10-30): aynı öğede `w-[var(--chat-panel-w)]` ve
        `w-[72px]` yarışıyordu; üretilen CSS'te `var()` kuralı sonra geldiği
        için KOMPAKT mod 72px'e HİÇ inmiyordu (e2e ölçtü). Tek kazanan inline
        stil: açıkken değişken, katlıyken 72px.
      */
      expect(SRC).toContain(`panelOpen ? 'min(var(--chat-panel-w), 55%)' : '72px'`)
      // `clamp()` mobilde artık yok — sürükleme mobilde çalışsın diye.
      expect(SRC).not.toContain('clamp(72px,28vw,300px)')
      // Genişlik geçişi animasyonlu kalır.
      expect(SRC).toContain('transition-[width] duration-200')
    })

    it('yan panel düğmesi GENİŞ ↔ KOMPAKT yapar, SEÇİLİ sohbeti SİLMEZ', () => {
      // Eski hâlde "←" sohbeti sıfırlıyordu (`setConversationId(null)`), yani
      // listeden geri dönüldüğünde seçim ve kaydırma konumu kayboluyordu.
      // 2026-10-13 (kullanıcı isteği): düğme artık tam ekran liste AÇMAZ,
      // paneli genişletip daraltır; seçili sohbet yerinde kalır.
      const toggle = CODE.slice(
        CODE.indexOf('function togglePanel()'),
        CODE.indexOf('function focusSearch()'),
      )
      expect(toggle).toContain('setPanelOpen(v => !v)')
      expect(toggle, 'seçili sohbet korunur').not.toContain('setConversationId')
      expect(toggle, 'seçili kişi korunur').not.toContain('setActivePeerId')
      expect(CODE).not.toContain('setListOpen')
      expect(CODE).not.toContain('chat.openPeopleList')
      expect(CODE).not.toContain('chat.backToList')
    })

    it('kişi önizlemesi GÖNDERENİ gösterir; mesaj yoksa boş durum metni', () => {
      expect(CODE).toContain('p.previewSender ?')
      // `@<gönderen>` öneki (regex: düz dizgede `${...}` lint hatası verir).
      expect(CODE).toMatch(/@\$\{p\.previewSender\}/)
      // Mesaj yoksa "Henüz mesaj yok. İlk mesajı sen yaz!" (chat.empty)
      expect(CODE).toContain(': t(\'chat.empty\')')
      // Eski hatalı davranış: önizleme KARŞI TARAFIN adını yazıyordu.
      expect(CODE).not.toMatch(/`\$\{p\.fullName\} · @\$\{p\.username\}`/)
    })

    it('sağ tık menüleri İMLEÇ konumunda ve AYNI ANDA TEK tanesi açılır', () => {
      // Konum `clientX/clientY`den; klavyeyle açılırsa öğenin köşesinden.
      expect(CODE).toContain('menuPoint(e)')
      expect(CODE).toMatch(/setMenu\(\{ kind: 'peer', peer: p, \.\.\.menuPoint\(e\) \}\)/)
      expect(CODE).toMatch(/setMenu\(\{ kind: 'message', message: m, \.\.\.menuPoint\(e\) \}\)/)
      // Tek `menu` state → çakışma imkânsız (eski ayrı menuPeer/menuMsg kalktı).
      expect(CODE).not.toContain('menuPeer')
      expect(CODE).not.toContain('menuMsg')
      // İki menü de ortak yüzeyi kullanır: taşma düzeltmesi + Esc/ok tuşları.
      expect(CODE).toContain('<MenuSurface')
      // Kişi menüsü kaydırılan listenin DIŞINDA (kırpılmaz).
      expect(CODE.indexOf('menu?.kind === \'peer\'')).toBeGreaterThan(CODE.indexOf('</aside>'))
    })

    it('mobilde uzun basma aynı menüyü açar (sağ tık şart değil)', () => {
      expect(CODE).toContain('useLongPress')
      expect(CODE).toContain('data-peer-id')
      expect(CODE).toContain('data-message-id')
      // Satır başına hook çağrılmaz (kapsayıcıya takılır) — `.map()` içinde hook YASAK.
      expect(CODE).toMatch(/const peerLongPress = useLongPress\(/)
      expect(CODE).toMatch(/const messageLongPress = useLongPress\(/)
    })

    it('mesaj menüsü: Kopyala · Yanıtla · İlet · Sabitle · Bilgi · Sil', () => {
      for (const key of ['reply', 'copy', 'forward', 'pin', 'info', 'delete']) {
        expect(CODE, `labels.${key}`).toContain(`label={labels.${key}}`)
      }
      // "İlet" yeni bir sunucu ucu gerektirmez: hedefle sohbet açılır + gönderilir.
      expect(CODE).toContain('async function forwardTo(peer: Peer, message: ChatMessageRow)')
      expect(CODE).toContain('action: \'send\'')
      // Sil kırmızı ve ayrı vurgulu kalır.
      expect(CODE).toContain('danger onSelect={onDelete}')
    })

    it('balon üstünde gönderen satırı var; art arda tekrarlanmaz', () => {
      expect(CODE).toContain('const showSender = !mine &&')
      expect(CODE).toContain('messages[i - 1]?.sender_id !== m.sender_id')
      expect(CODE).toContain('{m.sender_name}')
      // Kendi mesajım sağda mavi, karşı taraf solda koyu gri (değişmedi).
      expect(CODE).toContain('mine ? \'items-end\' : \'items-start\'')
      expect(CODE).toContain('mine ? \'bg-primary text-primary-fg\' : \'bg-foreground/10 text-foreground\'')
    })

    it('yükleme ekranı iskelet: "Sohbet yükleniyor" metni basılmaz', () => {
      expect(SRC).toContain('ChatSkeleton')
      expect(SRC).toMatch(/role="status"/)
      // metin yalnız aria-label ile duyurulur, ekrana yazılmaz
      expect(SRC).not.toMatch(/>\s*\{t\('chat\.loading'\)\}\s*</)
    })

    it('hata TAM EKRANI KAPLAMAZ: sohbetin içinde uyarı bandı olur', () => {
      expect(SRC).toMatch(/role="alert"/)
      expect(SRC).not.toMatch(/<ChatNotice icon="❌"/)
    })

    it('"erişim yok" tam ekranı YOK (sunucu görünmeyeni listelemez)', () => {
      // tek anıldığı yer açıklayıcı yorumdur; kodda böyle bir metin/ekran yok
      expect(SRC).not.toMatch(/'Erişim yok/)
      expect(SRC).toContain('chat.selectPerson')
    })

    it('"Önemli kişi olarak işaretle" başlıkta DEĞİL, sağ tık menüsünde', () => {
      // 2026-10-13 kullanıcı isteği: başlıktaki ⚪/🔴 düğmesi + `toggleImportant`
      // kaldırıldı; karar PeerMenu'de (sağ tık) durur.
      expect(SRC).not.toContain('toggleImportant')
      expect(SRC).not.toContain('setImportant')
      expect(SRC).toContain('onToggle(\'important\'')
      expect(SRC).toContain('t(\'chat.markImportant\')')
      expect(SRC).toContain('t(\'chat.unmarkImportant\')')
    })

    it('yan panel düğmesi başlıkta durur: listeyi genişletir/daraltır (kaplama YOK)', () => {
      // 2026-10-13 (SON istek): "Hamburger butonu sohbet başlığında kalsın ama
      // artık tam ekran liste açmasın: liste panelini genişletip daraltsın
      // (geniş mod ↔ kompakt/avatar modu). Seçimi localStorage'a kaydet."
      expect(CODE).toContain('data-testid="chat-panel-toggle"')
      expect(CODE).toContain('t(\'chat.togglePanel\')')
      expect(CODE).toContain('CHAT_PANEL_OPEN_KEY')
      expect(CODE).toContain('localStorage.setItem(CHAT_PANEL_OPEN_KEY')
      // Düğme her genişlikte görünür: liste kaplama değil, hep yan yana sütun.
      expect(CODE).not.toMatch(/!threadOpen && 'hidden md:grid'/)
      // Dar ekranda otomatik KOMPAKT başlar (480px altı).
      expect(CODE).toContain('isNarrowScreen()')
      expect(CODE).toContain('CHAT_NARROW_QUERY = \'(max-width: 479px)\'')
      // Kaplama ve X kapatma tamamen gitti.
      expect(SRC).not.toContain('absolute inset-0 z-40')
      expect(CODE).not.toContain('setListOpen')
    })

    it('kendi satırım yalnız yöneticiye görünür ve "TARIK ELER TARNAK (Siz)" yazar', () => {
      /*
        Kullanıcı istekleri (2026-10-13, kronolojik):
          1. "kullanıcı kendisiyle de konuşamasın" + "bir grupta yer almayıp
             sadece benimle konuşabilen kişi gözükmesin",
          2. SON istek: "Admin kendisini görsün kendisiyle konuşa bilsin ama
             ismi TARIK ELER TARNAK (Siz) görünsün — bu 'Siz' hangi dildeysen
             ona çevrilir ve ismin SONUNA eklenir".
        Net davranış (2026-10-16 GÜNCELLENDİ): "ben adminim neden bütün herkesi
        görmüyorum, bütün kullanıcıları görebilmeliyim sonuçta adminim" →
        YÖNETİCİ kayıtlı HERKESİ görür, sohbeti olmayan kayıtlar DA (aşağıdaki
        "bütün kullanıcılar" testi). Normal kullanıcıda davranış aynı: kendi
        satırı görünmez, yalnız konuşabileceği kişiyi görür.
      */
      expect(CODE).toMatch(/isAdmin \? true : p\.id !== selfId && !!p\.hasConversation/)
      // Kendi satırımda TAKMA ADIM değil TAM ADIM + yerelleşmiş parantezli ek.
      expect(CODE).toMatch(/p\.id === selfId\s*\? `\$\{p\.fullName \|\| p\.username\} \(\$\{you\}\)`/)
      expect(CODE).toContain('t(\'chat.you\')')
      // Normal kullanıcı kendisiyle sohbet açamaz (kapı yalnız yöneticiye açık).
      expect(CODE).toMatch(/if \(peerId === selfId && !isAdmin\) \{\s*\n\s*return/)
    })

    it('boş alana sağ tık menüsü: "Kişi ara · Sohbeti yenile · En sona git"', () => {
      // Kullanıcı isteği: "boş bir yere sağ tıkladığımda da bir şeyler çıksın".
      expect(CODE).toContain('kind: \'area\'')
      for (const key of ['findPerson', 'refresh', 'scrollBottom']) {
        expect(CODE, `t('chat.${key}')`).toContain(`t('chat.${key}')`)
      }
      // Menü yine panelin DIŞINDA (kırpılmaz) ve imlecin konumunda açılır.
      expect(CODE.indexOf('menu?.kind === \'area\'')).toBeGreaterThan(CODE.indexOf('</aside>'))
      expect(CODE).toContain('onAreaContextMenu')
    })

    it('sohbet başlığına (isme) de sağ tık yapılabilir', () => {
      // Kullanıcı isteği: "bir sohbet açtık, üstte ismi oluyor ya — ordaki
      // kısma da sağ tıklayabilelim".
      expect(CODE).toMatch(/data-peer-id=\{activePeer\?\.id\}/)
      expect(CODE).toMatch(/setMenu\(\{ kind: 'peer', peer: activePeer, \.\.\.menuPoint\(e\) \}\)/)
    })

    it('kaydırma MESAJ ALANINDA kalır: sayfayı kaydıran scrollIntoView YOK', () => {
      // Kullanıcı isteği: "sohbet sayfasında kayma var, düzelt; kaydırma grubun
      // içinde olsun ama o sayfada olmasın". `scrollIntoView` belge
      // kaydırılabilirse ATALARIN HEPSİNİ kaydırır → sayfa da kayıyordu.
      expect(CODE).not.toContain('scrollIntoView')
      expect(CODE).toContain('box.scrollTo({ top: box.scrollHeight')
      expect(CODE).toContain('ref={listRef}')
      expect(CODE).toContain('function jumpToMessage(id: string)')
    })

    it('seçili kişi satırı belli olur (mavi jeton tonu)', () => {
      // Kullanıcı isteği: "seçili kişinin arka planı bi tık daha koyu olsun /
      // seçili olduğu anlaşılmalı" — sitedeki `bg-primary/15` diliyle aynı.
      expect(CODE).toMatch(/p\.id === activePeerId && 'bg-primary\/15 hover:bg-primary\/20'/)
    })

    it('yazma alanı: odak halkası kapanır + sarı seçim tek kaynaktan gelir', () => {
      expect(SRC).toContain('chat-composer-field')
      const CSS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
      expect(CSS).toContain('.chat-composer-field:focus-visible')
      // Input'a ÖZEL seçim rengi kaldırıldı: sitedeki tek `::selection`
      // (@lobehub/ui ThemeProvider → sarı) geçerli olur. (Yorumda anılması
      // serbest; KURAL olmadığını doğruluyoruz.)
      expect(CSS).not.toMatch(/input::selection\s*[,{]/)
    })
  })

  /*
    2026-10-16 KULLANICI İSTEKLERİ — WhatsApp benzeri yanıt (alıntı) + tik
    mantığı. Kaynak sözleşmesi: istendiği halde sessizce kaybolmasın.
       1. "mesajı yanıtlama, alıntı"
       2. "tikleri düzelt: gönderildi/iletildi/okundu — yeşil KULLANMA"
  */
  describe('yanıt (alıntı) akışı — 2026-10-16', () => {
    it('gönderim `replyToId`yi API\'ye taşır (yanıt kaydedilir)', () => {
      expect(SRC).toContain('replyToId')
      // metin gönderiminde gövdeye konur
      expect(SRC).toMatch(/body: JSON\.stringify\(\{ conversationId, text, replyToId \}\)/)
      // medya da yanıtlanabilir — taslakta bekleyen yanıt düşmez
      expect(SRC).toMatch(/replyToId: target\?\.id/)
    })

    it('yanıt 3 yoldan başlatılır: hover butonu, sağ tık menüsü, sağa kaydırma', () => {
      // (a) mesaj menüsünde "Yanıtla"
      expect(SRC).toContain('label={labels.reply}')
      // (b) hover ok butonu aynı menüyü açar — ikinci menü yazılmaz
      expect(SRC).toContain('data-testid="chat-reply-button"')
      expect(SRC).toMatch(/onReply=\{\(\) => \{ startReply\(menu\.message\.id\)/)
      // (c) mobil: kaydırarak yanıtla (tek kapsayıcıya takılan olay tabanlı hook)
      expect(SRC).toContain('useSwipeReply(startReply)')
      expect(SRC).toContain('data-reply-hint')
      // dokunmatikte dikey kaydırma bozulmaz
      expect(SRC).toContain('touch-pan-y')
    })

    it('seçilince giriş alanına odaklanır', () => {
      expect(SRC).toMatch(/const startReply = useCallback\(\(messageId: string\) => \{[\s\S]{0,600}inputRef\.current\?\.focus\(\)/)
    })

    it('alıntıya tıklayınca kaynak mesaja gidip ~2 sn vurgulanır', () => {
      expect(SRC).toContain('jumpToMessage')
      expect(SRC).toContain('msg-flash')
      expect(SRC).toMatch(/const FLASH_MS = 1_900/)
      // bulunamazsa bildirim
      expect(SRC).toContain('chat.replyNotFound')
      expect(SRC).toContain('role="button"')
      expect(SRC).toContain('aria-label={t(\'chat.replyJump\')}')
    })

    it('giriş üstü önizleme: ✕ ve Esc ile kapanır, sohbet değişince temizlenir', () => {
      expect(SRC).toContain('data-testid="chat-reply-preview"')
      expect(SRC).toContain('t(\'chat.cancelReply\')')
      expect(SRC).toMatch(/e\.key === 'Escape'[\s\S]{0,120}setReplyTo\(null\)/)
      // sohbet değişince temizlenir
      expect(SRC).toMatch(/useEffect\(\(\) => \{\s*\n\s*setReplyTo\(null\)\s*\n\s*\}, \[conversationId\]\)/)
    })

    it('alıntı bloğu silinen hedefte "silindi" der (içerik sızmaz)', () => {
      expect(SRC).toContain('chat.deletedMessage')
      // sunucudan gelen özet kullanılır — istemci yeniden hesaplamaz
      expect(SRC).toContain('replyLive.deleted_for_all')
    })
  })

  describe('tik mantığı — 2026-10-16 (yeşil YOK)', () => {
    it('durum TEK kaynaktan türer: balon + sohbet listesi aynı fonksiyonu kullanır', () => {
      expect(SRC).toContain('tickFor(m, { pending: m._pending, failed: m._failed, selfChat })')
      // liste önizlemesindeki tik de AYNI karar fonksiyonundan geçer
      expect(SRC).toContain('tickForFlags(')
      expect(SRC).toMatch(/p\.lastMessage\?\.mine/)
      // renk yere göre seçilir (balon mavi, liste şeffaf) — ama karar tek.
      expect(SRC).toContain('TICK_LIST_COLORS')
    })

    it('iyimser mesaj asla doğrudan çift tikle başlamaz (önce saat)', () => {
      expect(SRC).toContain('_pending: true')
      expect(SRC).toMatch(/m\._pending\s*\? <ClockIcon/)
    })

    it('başarısız gönderim kırmızı ünlem + "Tekrar dene"', () => {
      expect(SRC).toContain('_failed: true')
      expect(SRC).toContain('data-testid="chat-retry"')
      expect(SRC).toContain('chat.retrySend')
    })

    it('okundu damgası yalnız sekme GÖRÜNÜR + liste GÖRÜNÜR + alıcı iken atılır', () => {
      // Gönderen kendi mesajını okundu yapamaz: sunucu ucu da `viewerId` ile
      // hariç tutar; istemci yalnız karşı taraftan okunmamış mesaj varsa çağırır.
      expect(SRC).toMatch(/document\.visibilityState !== 'visible'/)
      expect(SRC).toContain('listVisible')
      expect(SRC).toMatch(/action: 'read'/)
      // mesaj GERÇEKTEN görünür alanda mı (kaydırma ile ölçülür)
      expect(SRC).toContain('IntersectionObserver')
    })

    it('durum adı ekran okuyucuya duyurulur (tooltip + aria-label)', () => {
      expect(SRC).toMatch(/title=\{t\(tick\.labelKey\)\}/)
      expect(SRC).toMatch(/aria-label=\{t\(tick\.labelKey\)\}/)
    })

    it('vurgu flash CSS\'i tanımlı ve balon zeminini EZMEZ', () => {
      const CSS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
      expect(CSS).toContain('@keyframes msg-flash')
      expect(CSS).toContain('.msg-flash')
    })
  })

  describe('admin herkesi görür · kendimle sohbet · kendi çevrimiçiliğim — 2026-10-16', () => {
    it('yönetici sohbeti OLMAYAN kayıtları da görür ("bütün kullanıcıları görebilmeliyim")', () => {
      expect(CODE).toMatch(/isAdmin \? true : p\.id !== selfId && !!p\.hasConversation/)
      // Sunucu zaten admin'e TÜM profilleri döner — gizleyen yer İSTEMCİYDİ.
      const API = readFileSync(join(process.cwd(), 'src/app/api/chat/users/route.ts'), 'utf8')
      expect(API).toContain('canSeeAllPeers')
      expect(API).toMatch(/canSeeAllPeers\(sessionUser\)/)
    })

    it('kendi sohbetim (`<id>|<id>`) liste verisini KAYBETMEZ', () => {
      // "karşı taraf" bulunamazsa satırın sahibi benim. Eski `.find(part !== me)`
      // kendi sohbetimde hiçbir şey bulamıyordu → önizleme/rozet/tik kayıptı.
      expect(CODE).toContain('const other = parts.find(part => part !== me) ?? (parts[0] === me ? me : undefined)')
    })

    it('kendimle sohbette tik ÇİFT MAVİ olur (tek gri tikte takılı kalmaz)', () => {
      // Kullanıcı: "kendime mesaj gönderiyorum tek tik nasıl kalabiliyor".
      expect(CODE).toContain('const selfChat = !!selfId && activePeerId === selfId')
      // balon tiki + liste tiki AYNI karardan geçer
      expect(CODE).toContain('failed: m._failed, selfChat')
      expect(CODE).toContain('tickForFlags(p.lastMessage, { selfChat: p.id === selfId })')
    })

    it('kendi noktam kırmızı olmaz: çevrimiçilik SEKME GÖRÜNÜRLÜĞÜNE bağlı', () => {
      // Kullanıcı: "kendim nasıl çevrimdışı olabiliyorum?" — eski kural "30 sn
      // etkileşim yoksa çevrimdışı" idi; artık tek çevrimdışı yolu sekmenin
      // gizlenmesi/kapanması.
      expect(SRC).not.toContain('LOCAL_ONLINE_TTL_MS')
      expect(CODE).toContain('localPresenceRef.current.isOnline = !document.hidden')
    })

    it('nabız aralığı sunucunun tazelik penceresinden KÜÇÜK (yoksa herkes çevrimdışı görünür)', () => {
      // Kök neden (2026-10-16): nabız 5 dk'da bir, `presenceOf` penceresi 60 sn
      // → nabız pencereler arasında kaçıyordu.
      const PEERS = readFileSync(join(process.cwd(), 'src/lib/chat-peers.ts'), 'utf8')
      const num = (src: string, re: RegExp) =>
        Number(re.exec(src)?.[1]?.replace(/_/g, ''))
      const sync = num(CODE, /const SYNC_INTERVAL_MS = ([\d_]+)/)
      const freshness = num(PEERS, /PRESENCE_ONLINE_MS = ([\d_]+)/)
      expect(sync).toBeGreaterThan(0)
      expect(freshness).toBeGreaterThan(0)
      expect(sync).toBeLessThan(freshness)
    })
  })
})
