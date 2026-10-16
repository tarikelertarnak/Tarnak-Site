import { describe, expect, it, vi } from 'vitest'

/**
 * Chat veri katmanı — davranış testleri.
 *
 * Gerçek `supabase-js` PostgREST builder'ı thenable bir zincirdir:
 *   client.from(t).select(...).eq(...).lt(...)  → Promise<{data,error,count}>
 * Mock zinciri taklit eder ve çıktıları BIR KUYRUK'tan sırayla verir, böylece
 * "önce say, sonra sil" iki adımlı akışı da ölçebiliriz.
 *
 * Ölçülenler:
 *  · doğrudan sohbet anahtarı kararlı ve sırasız (a|b === b|a)
 *  · olmayan tablo → düzgün `ChatSchemaMissing` (çökme yok)
 *  · teslim/okundu işaretleri yalnızca boş alanları hedefler
 *  · deleteForAll FİZİKSEL silmez (yumuşak) → "Herkesten sil" geri alınabilir
 *  · normal kullanıcıya silinen mesajın içeriği MASKELENİR (sızmaz), admin görür
 *  · retention: 'forever'/'off' hiç silmez; süre dolanı fiziksel siler
 */

/** Çıktı kuyruğu: her thenable zincir bir sonraki sonucu tüketir. */
let results: Array<{ data?: unknown, error?: unknown, count?: number | null }> = []
function push(...r: Array<{ data?: unknown, error?: unknown, count?: number | null }>) {
  results = r
}
function take() {
  return results.shift() ?? { data: null, error: null }
}

const calls = {
  update: [] as unknown[][],
  is: [] as unknown[][],
  neq: [] as unknown[][],
  in: [] as unknown[][],
  insert: [] as unknown[][],
  delete: [] as unknown[][],
  eq: [] as unknown[][],
  lt: [] as unknown[][],
  select: [] as unknown[][],
  upsert: [] as unknown[][],
}

function makeQuery() {
  const q: Record<string, unknown> = {}
  q.from = () => q
  q.select = (...a: unknown[]) => {
    calls.select.push(a)
    return q
  }
  q.insert = (...a: unknown[]) => {
    calls.insert.push(a)
    return q
  }
  q.upsert = (...a: unknown[]) => {
    calls.upsert.push(a)
    return q
  }
  q.update = (...a: unknown[]) => {
    calls.update.push(a)
    return q
  }
  q.delete = (...a: unknown[]) => {
    calls.delete.push(a)
    return q
  }
  q.eq = (...a: unknown[]) => {
    calls.eq.push(a)
    return q
  }
  q.order = () => q
  q.limit = () => q
  q.is = (...a: unknown[]) => {
    calls.is.push(a)
    return q
  }
  q.neq = (...a: unknown[]) => {
    calls.neq.push(a)
    return q
  }
  q.lt = (...a: unknown[]) => {
    calls.lt.push(a)
    return q
  }
  q.in = (...a: unknown[]) => {
    calls.in.push(a)
    return q
  }
  q.maybeSingle = () => Promise.resolve(take())
  q.single = () => Promise.resolve(take())
  q.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(take()).then(res as never, rej as never)
  return q
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: () => makeQuery() }),
}))

const {
  ChatSchemaMissing,
  deleteForAll,
  directKey,
  getOrCreateDirectConversation,
  listMessages,
  markDelivered,
  markRead,
  purgeExpiredDeleted,
  resolveChatIdentity,
  setImportant,
  setPinned,
  sendMessage,
  siteOwnerId,
} = await import('@/lib/chat-db')

function reset(...r: Array<{ data?: unknown, error?: unknown, count?: number | null }>) {
  push(...(r.length ? r : [{ data: null, error: null }]))
  calls.update = []
  calls.is = []
  calls.neq = []
  calls.in = []
  calls.insert = []
  calls.delete = []
  calls.eq = []
  calls.lt = []
  calls.select = []
  calls.upsert = []
}

describe('chat · doğrudan sohbet anahtarı', () => {
  it('iki kullanıcı arasındaki anahtar sırasız (a|b === b|a)', () => {
    expect(directKey('u1', 'u2')).toBe(directKey('u2', 'u1'))
    expect(directKey('u1', 'u2')).toContain('|')
  })
})

describe('chat · tablo yoksa çökmez', () => {
  it('listMessages "does not exist" → ChatSchemaMissing', async () => {
    reset({ data: null, error: { code: '42P01', message: 'relation does not exist' } })
    await expect(listMessages('c1', false)).rejects.toBeInstanceOf(ChatSchemaMissing)
  })
})

describe('chat · teslim / okundu', () => {
  it('markDelivered yalnızca teslim edilmemişleri hedefler', async () => {
    reset()
    await markDelivered('c1', 'u2')
    expect(calls.update.length).toBeGreaterThan(0)
    expect(calls.is).toContainEqual(['delivered_at', null])
  })

  it('markRead yalnızca okunmamışları hedefler', async () => {
    reset()
    await markRead('c1', 'u2')
    expect(calls.is).toContainEqual(['read_at', null])
  })

  /*
    KÖK NEDEN DÜZELTMESİ (2026-10-16): eskiden bu iki sorguda `sender_id`
    filtresi YOKTU → gönderen kendi sohbetini açınca kendi mesajları da
    "okundu" oluyordu ve alıcı hiç görmemişken çift mavi tik görünüyordu.
  */
  it('markDelivered/markRead GÖNDERENİ hariç tutar (kendi mesajım asla okunmaz)', async () => {
    reset()
    await markDelivered('c1', 'u1')
    await markRead('c1', 'u1')
    expect(calls.neq.filter(([c, v]) => c === 'sender_id' && v === 'u1')).toHaveLength(2)
  })
})

describe('chat · silme onayı (yumuşak silme)', () => {
  it('deleteForAll fiziksel silmez; deleted_for_all işaretler', async () => {
    reset()
    await deleteForAll('m1', 'me')
    expect(calls.delete).toHaveLength(0) // `.delete()` hiç çağrılmadı
    const row = calls.update[0][0] as Record<string, unknown>
    expect(row.deleted_for_all).toBe(true)
    expect(row.deleted_by).toBe('me')
    expect(row.deleted_at).toBeTruthy()
  })

  it('setPinned sabitleme alanlarını günceller', async () => {
    reset()
    await setPinned('m1', true)
    expect(calls.update[0][0]).toEqual(expect.objectContaining({ pinned: true }))
  })

  it('setImportant sohbeti önemli işaretler', async () => {
    reset()
    await setImportant('c1', true)
    expect(calls.update[0][0]).toEqual(expect.objectContaining({ important: true }))
  })
})

describe('chat · silinen mesaj içeriği sızmaz', () => {
  const deleted = {
    id: 'm1',
    conversation_id: 'c1',
    sender_id: 'u1',
    sender_name: 'Ali',
    text: 'GİZLİ metin',
    kind: 'text',
    file_url: '/uploads/chat/secret.png',
    file_name: 'secret.png',
    file_type: 'image/png',
    file_size: 100,
    audio_duration: null,
    reply_to_id: null,
    delivered_at: null,
    read_at: null,
    pinned: false,
    pinned_at: null,
    deleted_for_all: true,
    deleted_by: 'u1',
    deleted_at: '2026-10-01T00:00:00Z',
    created_at: '2026-10-01T00:00:00Z',
  }

  it('normal kullanıcı silinen mesajın içeriğini GÖREMEZ (maskeli)', async () => {
    reset({ data: [deleted] })
    const [m] = await listMessages('c1', false)
    expect(m.deleted_for_all).toBe(true)
    expect(m.text).toBeNull()
    expect(m.file_url).toBeNull()
    expect(m.file_name).toBeNull()
  })

  it('admin retention boyunca gerçek içeriği GÖRÜR', async () => {
    reset({ data: [deleted] })
    const [m] = await listMessages('c1', true)
    expect(m.text).toBe('GİZLİ metin')
    expect(m.file_url).toBe('/uploads/chat/secret.png')
  })
})

/**
 * YANIT ÖZETİ (2026-10-16 kullanıcı isteği: "mesajları çekerken yanıtlanan
 * mesajın kısa özeti (gönderen adı, metin ilk ~150 karakter, medya türü,
 * silinmiş mi) birlikte dönsün").
 */
describe('chat · yanıtlanan mesajın özeti', () => {
  const replied = {
    id: 'm2',
    conversation_id: 'c1',
    sender_id: 'u2',
    sender_name: 'Osman',
    text: 'yanıtlanan metin',
    kind: 'text',
    file_url: null,
    file_name: null,
    file_type: null,
    file_size: null,
    audio_duration: null,
    reply_to_id: 'm1',
    delivered_at: null,
    read_at: null,
    pinned: false,
    pinned_at: null,
    deleted_for_all: false,
    deleted_by: null,
    deleted_at: null,
    created_at: '2026-10-02T00:00:00Z',
  }

  it('yanıt özeti gönderen adı + metinle gelir', async () => {
    reset(
      { data: [replied] },
      { data: [{ id: 'm1', sender_id: 'u1', sender_name: 'Ali', text: 'kaynak', kind: 'text', file_name: null, file_url: null, deleted_for_all: false }] },
    )
    const [m] = await listMessages('c1', false)
    expect(m.reply_to).toEqual({
      id: 'm1',
      sender_id: 'u1',
      sender_name: 'Ali',
      text: 'kaynak',
      kind: 'text',
      file_name: null,
      file_url: null,
      deleted: false,
    })
  })

  it('metin 150 karaktere kırpılır', async () => {
    const long = 'a'.repeat(400)
    reset(
      { data: [replied] },
      { data: [{ id: 'm1', sender_id: 'u1', sender_name: 'Ali', text: long, kind: 'text', file_name: null, file_url: null, deleted_for_all: false }] },
    )
    const [m] = await listMessages('c1', false)
    expect(m.reply_to?.text).toHaveLength(150)
  })

  it('sİLİNMİŞ kaynağın metni/dosyası TAŞINMAZ, "silindi" işareti döner', async () => {
    reset(
      { data: [replied] },
      { data: [{ id: 'm1', sender_id: 'u1', sender_name: 'Ali', text: 'GİZLİ', kind: 'image', file_name: 'secret.png', file_url: '/uploads/chat/secret.png', deleted_for_all: true }] },
    )
    const [m] = await listMessages('c1', false)
    expect(m.reply_to?.deleted).toBe(true)
    expect(m.reply_to?.text).toBeNull()
    expect(m.reply_to?.file_url).toBeNull()
  })

  it('kaynak hiç bulunamazsa (fiziksel silinmiş) yanıt bloğu kaybolmaz', async () => {
    reset({ data: [replied] }, { data: [] })
    const [m] = await listMessages('c1', false)
    expect(m.reply_to?.deleted).toBe(true)
    expect(m.reply_to?.id).toBe('m1')
  })

  it('yanıt yoksa ek sorgu yapılmaz', async () => {
    const plain = { ...replied, reply_to_id: null }
    reset({ data: [plain] })
    const [m] = await listMessages('c1', false)
    expect(m.reply_to).toBeNull()
    expect(calls.in).toHaveLength(0)
  })
})

/**
 * YANIT DOĞRULAMASI (2026-10-16 kullanıcı isteği): "sunucu bu id'nin aynı
 * sohbete ait olduğunu doğrulasın".
 */
describe('chat · gönderimde yanıt doğrulaması', () => {
  const saved = {
    id: 'm9',
    conversation_id: 'c1',
    sender_id: 'u1',
    sender_name: 'Ali',
    text: 'cevap',
    kind: 'text',
    file_url: null,
    file_name: null,
    file_type: null,
    file_size: null,
    audio_duration: null,
    reply_to_id: 'm1',
    delivered_at: null,
    read_at: null,
    pinned: false,
    pinned_at: null,
    deleted_for_all: false,
    deleted_by: null,
    deleted_at: null,
    created_at: '2026-10-03T00:00:00Z',
  }

  it('bAŞKA sohbetin mesajına yanıt DÜŞÜRÜLÜR (mesaj yine gönderilir)', async () => {
    reset({ data: null }, { data: saved }, { data: null })
    await sendMessage({ conversationId: 'c1', senderId: 'u1', senderName: 'Ali', text: 'cevap', replyToId: 'baska-sohbetin-mesaji' })
    // doğrulama aynı VE doğru sohbeti sordu
    expect(calls.eq).toContainEqual(['conversation_id', 'c1'])
    expect(calls.insert[0][0]).toEqual(expect.objectContaining({ reply_to_id: null }))
  })

  it('aYNI sohbetteki mesaja yanıt KORUNUR', async () => {
    reset({ data: { id: 'm1' } }, { data: saved }, { data: null })
    await sendMessage({ conversationId: 'c1', senderId: 'u1', senderName: 'Ali', text: 'cevap', replyToId: 'm1' })
    expect(calls.insert[0][0]).toEqual(expect.objectContaining({ reply_to_id: 'm1' }))
  })

  it('yanıt id verilmezse doğrulama sorgusu YAPILMAZ', async () => {
    reset({ data: saved }, { data: null })
    await sendMessage({ conversationId: 'c1', senderId: 'u1', senderName: 'Ali', text: 'cevap' })
    expect(calls.insert[0][0]).toEqual(expect.objectContaining({ reply_to_id: null }))
  })
})

describe('chat · retention', () => {
  it('"forever"/"off" → hiç fiziksel silme yapılmaz', async () => {
    reset({
      data: [
        { id: 'c1', deleted_retention: 'forever' },
        { id: 'c2', deleted_retention: 'off' },
      ],
    })
    const removed = await purgeExpiredDeleted()
    expect(removed).toBe(0)
    expect(calls.delete).toHaveLength(0)
  })

  it('"30 days" + süresi geçen mesaj varsa → fiziksel siler, sayısını döndürür', async () => {
    // 1. sorgu: retention listesi · 2. sorgu: sayım (count) · 3. sorgu: delete
    reset(
      { data: [{ id: 'c1', deleted_retention: '30 days' }] },
      { count: 3 },
      { data: null },
    )
    const removed = await purgeExpiredDeleted()
    expect(removed).toBe(3)
    expect(calls.delete.length).toBe(1)
    expect(calls.lt.length).toBe(2) // sayımda + silmede
  })

  it('"30 days" ama süresi geçen YOK → boşuna silme yapmaz', async () => {
    reset(
      { data: [{ id: 'c1', deleted_retention: '30 days' }] },
      { count: 0 },
    )
    const removed = await purgeExpiredDeleted()
    expect(removed).toBe(0)
    expect(calls.delete).toHaveLength(0)
  })
})

/**
 * KÖK NEDEN (2026-10-12 canlı ölçüm).
 *
 * `chat_conversations`ta `direct_key = "<aynı id>|<aynı id>"` (kişinin
 * KENDİSİYLE sohbeti) bir satır vardı ama `chat_participants`ta HİÇ satırı
 * yoktu → sohbet açılıyor, mesaj okuma `isParticipant` false olduğu için
 * "Erişim yok." (403) dönüyordu. Sebep: iki katılımcı aynı birincil anahtara
 * `(conversation_id, user_id)` düşüyor, INSERT çakışıp TAMAMEN geri alınıyordu.
 */
describe('chat · kendisiyle sohbet + eksik katılımı onarma', () => {
  it('aynı id iki kez gelse bile katılımcı TEK satır yazılır', async () => {
    reset({ data: null }, { data: { id: 'c1', kind: 'direct', direct_key: 'u1|u1' } })
    const conv = await getOrCreateDirectConversation('u1', 'u1')
    expect(conv.id).toBe('c1')
    expect(calls.upsert).toHaveLength(1)
    const [rows, opts] = calls.upsert[0] as [Array<{ user_id: string }>, Record<string, unknown>]
    expect(rows).toHaveLength(1)
    expect(rows[0].user_id).toBe('u1')
    expect(opts.onConflict).toBe('conversation_id,user_id')
    expect(opts.ignoreDuplicates).toBe(true)
  })

  it('var olan sohbette katılım EKSİKSE onarılır (Erişim yok. regresyonu)', async () => {
    reset({ data: { id: 'c1', kind: 'direct', direct_key: 'u1|u2' } })
    const conv = await getOrCreateDirectConversation('u1', 'u2')
    expect(conv.id).toBe('c1')
    expect(calls.upsert).toHaveLength(1)
    const [rows] = calls.upsert[0] as [Array<{ user_id: string }>]
    expect(rows.map(r => r.user_id)).toEqual(['u1', 'u2'])
  })
})

/**
 * SOHBET KİMLİĞİ (2026-10-12): site sahibi `/login` (id `admin:<ad>`) ve
 * `/sign` (uuid) ile girebiliyor. İki kimlik iki AYRI geçmiş demekti; sahip
 * bir yolla konuştuğunu diğerinde göremiyordu ("kimse yok, kendim bile").
 */
describe('chat · sohbet kimliği çözümü', () => {
  it('kullanıcı adı profilde varsa sohbet kimliği o profilin uuid\'idir', async () => {
    reset({ data: [{ id: 'uuid-1', username: 'tarikelertarnak' }] })
    await expect(resolveChatIdentity('admin:TARIKELERTARNAK', 'TARIKELERTARNAK'))
      .resolves
.toBe('uuid-1')
  })

  it('eşleşme yoksa id aynen kalır (davranış değişmez)', async () => {
    reset({ data: [{ id: 'uuid-2', username: 'baskasi' }] })
    await expect(resolveChatIdentity('admin:YOK', 'YOK')).resolves.toBe('admin:YOK')
  })

  it('admin olmayan kimlik için sorgu bile yapılmaz', async () => {
    reset()
    await expect(resolveChatIdentity('uuid-9', 'tarikelertarnak')).resolves.toBe('uuid-9')
    expect(calls.select).toHaveLength(0)
  })
})

describe('chat · site sahibi', () => {
  it('is_owner=true olan profili bulur', async () => {
    reset({ data: { id: 'owner-1' } })
    await expect(siteOwnerId()).resolves.toBe('owner-1')
    expect(calls.eq).toContainEqual(['is_owner', true])
  })

  it('sahip yoksa boş string döner (uç 503 verir, çökmez)', async () => {
    reset({ data: null })
    await expect(siteOwnerId()).resolves.toBe('')
  })
})
