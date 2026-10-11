import { describe, expect, it, vi } from 'vitest'

/**
 * Chat v2 veri katmanı — davranış testleri.
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
  delete: [] as unknown[][],
  eq: [] as unknown[][],
  lt: [] as unknown[][],
  select: [] as unknown[][],
}

function makeQuery() {
  const q: Record<string, unknown> = {}
  q.from = () => q
  q.select = (...a: unknown[]) => {
    calls.select.push(a)
    return q
  }
  q.insert = () => q
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
  q.is = (...a: unknown[]) => {
    calls.is.push(a)
    return q
  }
  q.lt = (...a: unknown[]) => {
    calls.lt.push(a)
    return q
  }
  q.in = () => q
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
  listMessages,
  markDelivered,
  markRead,
  purgeExpiredDeleted,
  setImportant,
  setPinned,
} = await import('@/lib/chat-v2')

function reset(...r: Array<{ data?: unknown, error?: unknown, count?: number | null }>) {
  push(...(r.length ? r : [{ data: null, error: null }]))
  calls.update = []
  calls.is = []
  calls.delete = []
  calls.eq = []
  calls.lt = []
  calls.select = []
}

describe('chat-v2 · doğrudan sohbet anahtarı', () => {
  it('iki kullanıcı arasındaki anahtar sırasız (a|b === b|a)', () => {
    expect(directKey('u1', 'u2')).toBe(directKey('u2', 'u1'))
    expect(directKey('u1', 'u2')).toContain('|')
  })
})

describe('chat-v2 · tablo yoksa çökmez', () => {
  it('listMessages "does not exist" → ChatSchemaMissing', async () => {
    reset({ data: null, error: { code: '42P01', message: 'relation does not exist' } })
    await expect(listMessages('c1', false)).rejects.toBeInstanceOf(ChatSchemaMissing)
  })
})

describe('chat-v2 · teslim / okundu', () => {
  it('markDelivered yalnızca teslim edilmemişleri hedefler', async () => {
    reset()
    await markDelivered('c1')
    expect(calls.update.length).toBeGreaterThan(0)
    expect(calls.is).toContainEqual(['delivered_at', null])
  })

  it('markRead yalnızca okunmamışları hedefler', async () => {
    reset()
    await markRead('c1')
    expect(calls.is).toContainEqual(['read_at', null])
  })
})

describe('chat-v2 · silme onayı (yumuşak silme)', () => {
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

describe('chat-v2 · silinen mesaj içeriği sızmaz', () => {
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

describe('chat-v2 · retention', () => {
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
