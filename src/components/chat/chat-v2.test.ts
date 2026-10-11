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
})
