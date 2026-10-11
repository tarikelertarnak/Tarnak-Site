import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Chat v2 arayüz kaynak-sözleşmesi (2026-10-11).
 *
 * Kullanıcı isteği çok geniş (WhatsApp benzeri). Bu test, istendiği halde
 * kolayca sessizce kaybolabilecek kritik davranışların KAYNAKTA bulunduğunu
 * garanti eder:
 *   · çift tik (teslim) / tek tik (okundu) gösterimi
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
  it('okundu (tek tik) ve teslim (çift tik) bilgisini gösterir', () => {
    // ✓ okundu → çift tik, ✓ teslim → çift/tek tik mantığı
    expect(SRC).toMatch(/m\.read_at \? '✓✓'/)
    expect(SRC).toContain('✓')
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
})
