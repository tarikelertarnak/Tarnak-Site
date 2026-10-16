import type { ReplySourceRow } from './chat-reply'
import { describe, expect, it } from 'vitest'
import {
  missingReplyPreview,
  REPLY_TEXT_MAX,
  replyPlaceholderKey,
  replySenderLabel,
  toReplyPreview,
} from './chat-reply'

/**
 * Yanıt (alıntı) özeti kuralları (2026-10-16 kullanıcı isteği).
 *
 * Bu kurallar HEM sunucuda (mesaj listesine alıntı iliştirirken) hem istemcide
 * (iyimser gönderim) çalışır — tek kopya olması bu testin konusu.
 *
 * Kritik olan: SİLİNMİŞ mesajın içeriği alıntıya TAŞINMAZ. Aksi halde "Herkesten
 * sil" yalan olurdu: metin balonun içinden kalıcı olarak okunabilirdi.
 */
const base: ReplySourceRow = {
  id: 'm1',
  sender_id: 'u2',
  sender_name: 'Osman',
  text: 'kısa metin',
  kind: 'text',
  file_name: null,
  file_url: null,
  deleted_for_all: false,
}

describe('toReplyPreview', () => {
  it('gönderen adı + metni taşır', () => {
    const p = toReplyPreview(base)
    expect(p.id).toBe('m1')
    expect(p.sender_name).toBe('Osman')
    expect(p.text).toBe('kısa metin')
    expect(p.deleted).toBe(false)
  })

  it(`metin ${REPLY_TEXT_MAX} karaktere kırpılır`, () => {
    const p = toReplyPreview({ ...base, text: 'a'.repeat(400) })
    expect(p.text).toHaveLength(REPLY_TEXT_MAX)
  })

  it('metin yoksa null (medya mesajı)', () => {
    expect(toReplyPreview({ ...base, text: null, kind: 'image', file_url: '/x.png' }).text).toBeNull()
  })

  it('medyanın dosya bilgisi korunur (balon küçük önizleme gösterir)', () => {
    const p = toReplyPreview({ ...base, text: null, kind: 'image', file_url: '/x.png', file_name: 'x.png' })
    expect(p.file_url).toBe('/x.png')
    expect(p.file_name).toBe('x.png')
  })

  /*
    GÜVENLİK: silinen mesajın metni/dosyası alıntıya geçmez. Aksi hâlde "Herkesten
    sil" işlemi içeriği gizlemez, yalnız asıl balonu boşaltırdı — alıntılar
    içeriği sonsuza kadar taşırdı.
  */
  it('sİLİNMİŞ mesajın metni ve dosyası TAŞINMAZ', () => {
    const p = toReplyPreview({
      ...base,
      text: 'GİZLİ metin',
      kind: 'image',
      file_name: 'secret.png',
      file_url: '/uploads/chat/secret.png',
      deleted_for_all: true,
    })
    expect(p.deleted).toBe(true)
    expect(p.text).toBeNull()
    expect(p.file_name).toBeNull()
    expect(p.file_url).toBeNull()
    // kimlik yine taşınır: arayüz "kimin mesajı silindi" diyebilsin
    expect(p.id).toBe('m1')
    expect(p.sender_name).toBe('Osman')
  })
})

describe('missingReplyPreview', () => {
  it('satırı hiç bulunamayan hedef için yine bir özet döner (alıntı kaybolmaz)', () => {
    const p = missingReplyPreview('silinmis-id')
    expect(p.id).toBe('silinmis-id')
    expect(p.deleted).toBe(true)
    expect(p.text).toBeNull()
  })
})

describe('replySenderLabel', () => {
  it('kendi mesajimda yerelleşmiş "Sen" etiketi', () => {
    expect(replySenderLabel({ sender_id: 'me', sender_name: 'Ali' }, 'me', 'Sen')).toBe('Sen')
  })

  it('karşı tarafta @kullanıcı adı', () => {
    expect(replySenderLabel({ sender_id: 'u2', sender_name: 'Osman' }, 'me', 'Sen')).toBe('@Osman')
  })

  // Fiziksel olarak silinmiş hedefte ad bilinmez → boş "@" görünmesin.
  it('ad bilinmiyorsa "—" yazılır', () => {
    const missing = missingReplyPreview('yok')
    expect(replySenderLabel(missing, 'me', 'Sen')).toBe('—')
  })

  it('sİLİNMİŞ ama adı bilinen hedefte ad yine gösterilir (gizli olan içerik)', () => {
    expect(replySenderLabel({ sender_id: 'u2', sender_name: 'Osman' }, 'me', 'Sen')).toBe('@Osman')
  })
})

describe('replyPlaceholderKey', () => {
  it('metinsiz mesajda türün okunabilir adına düşer', () => {
    expect(replyPlaceholderKey('image')).toBe('chat.mediaPhoto')
    expect(replyPlaceholderKey('video')).toBe('chat.mediaVideo')
    expect(replyPlaceholderKey('audio')).toBe('chat.mediaAudio')
    expect(replyPlaceholderKey('file')).toBe('chat.mediaFile')
  })

  it('düz metinde ek metin uydurulmaz (boş anahtar)', () => {
    expect(replyPlaceholderKey('text')).toBe('')
  })
})
