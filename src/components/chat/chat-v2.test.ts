import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Chat v2 arayüz kaynak-sözleşmesi (2026-10-11).
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
  join(process.cwd(), 'src/components/chat/chat-v2.tsx'),
  'utf8',
)

describe('chat-v2 arayüz sözleşmesi', () => {
  it('tik: gönderildi/teslim → sarı, okundu → yeşil; inline SVG ikonlar', () => {
    // İkon + renk kararı saf modülde (chat-ticks.test.ts onu tek tek doğrular);
    // bileşenin işi yalnızca o kararı render etmek.
    // 2026-10-13: ikon importu çok satıra bölündü (Mic/Paperclip/Send/Sticker
    // eklendi) → kalıp virgül/boşluk değişimine dayanıklı hâle getirildi.
    expect(SRC).toMatch(/import \{[^}]*TickReadIcon[^}]*TickSentIcon[^}]*\} from '@\/components\/ui\/icons'/)
    expect(SRC).toContain('tickFor(m)')
    expect(SRC).toMatch(/tick\.double \? <TickReadIcon[^>]*\/> : <TickSentIcon/)
    expect(SRC).toMatch(/className=\{cn\('inline-flex shrink-0', tick\.color\)\}/)
    // Renk bileşende SABİT yazılmaz (tek kaynak lib/chat-ticks.ts).
    expect(SRC).not.toMatch(/text-(amber|green)-\d/)
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

  it('yanıt (reply) akışı: kaynak mesaja gitme', () => {
    expect(SRC).toContain('setReplyTo')
    expect(SRC).toContain('replyToId')
    // kaynak mesaja kaydırma
    expect(SRC).toMatch(/scrollIntoView/)
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
    expect(SRC).toContain('EMOJIS')
    expect(SRC).toContain('uploadFile')
    // tür bazlı render
    expect(SRC).toMatch(/kind === 'image'/)
    expect(SRC).toMatch(/kind === 'audio'/)
    expect(SRC).toMatch(/kind === 'video'/)
  })

  it('mesaj bilgisi paneli: Okundu · Teslim edildi · Tarih', () => {
    expect(SRC).toContain('MessageInfo')
    expect(SRC).toContain('readAt')
    expect(SRC).toContain('deliveredAt')
    // tarih GG.AA.YYYY
    expect(SRC).toMatch(/toLocaleDateString\('tr-TR'/)
  })

  it('önemli kişi işareti (kırmızı vurgu 🔴) API\'ye bildirilir', () => {
    expect(SRC).toContain('🔴')
    expect(SRC).toContain('toggleImportant')
    expect(SRC).toContain('important')
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
      for (const page of ['login', 'sign']) {
        const src = readFileSync(join(process.cwd(), `src/app/${page}/page.tsx`), 'utf8')
        expect(src).toContain('safeNext')
        expect(src).toContain('searchParams')
        // giriş sonrası her zaman / veya /admin'e atan ESKİ davranış kalktı
        expect(src).toMatch(/redirect\(next !== '\/' \? next/)
      }
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
      // genişlik CSS değişkeniyle panele geçer
      expect(SRC).toContain('md:w-[var(--chat-panel-w)]')
    })

    it('sohbet tam ekranı kaplar (eski 760px / 68svh / max-w-3xl sınırı yok)', () => {
      expect(SRC).toContain('flex h-[calc(100svh-19rem)] min-h-[260px] w-full')
      // sınıf listesinde eski sınırlar YOK (yorumda anılmaları serbest)
      expect(SRC).not.toMatch(/className="[^"]*max-h-\[760px\]/)
      expect(SRC).not.toMatch(/className="[^"]*68svh/)
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
  })
})
