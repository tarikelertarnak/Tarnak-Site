import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `supabase/chat.sql` şema sözleşmesi.
 *
 * ÖLÇÜLEN HATA (2026-10-11): site sahibi `/login` (admin.json) ile girdiğinde
 * kimliği `admin:TARIKELERTARNAK` — bir UUID DEĞİL. Şemada
 * `chat_participants.user_id uuid references auth.users(id)` olduğu için admin
 * herhangi biriyle sohbet açmaya çalıştığında "invalid input syntax for type
 * uuid" alıyordu; yani admin kimseye yazamıyordu.
 *
 * Bu test, kimlik sütunlarının metin (FK'siz) kaldığını sabitler. Mesajın
 * KENDİ id'si (`reply_to_id`) yine uuid olmalı — o bir mesaj referansı,
 * kimlik değil.
 */
const SQL = readFileSync(join(process.cwd(), 'supabase/chat.sql'), 'utf8')

describe('chat.sql şema sözleşmesi', () => {
  it('kimlik sütunları uuid/auth.users FK değil (admin.json kimliği UUID değil)', () => {
    expect(SQL).not.toMatch(/user_id\s+uuid\s+references\s+auth\.users/)
    expect(SQL).not.toMatch(/sender_id\s+uuid\s+references\s+auth\.users/)
    expect(SQL).not.toMatch(/deleted_by\s+uuid\s+references\s+auth\.users/)
  })

  it('kimlik sütunları text', () => {
    expect(SQL).toMatch(/user_id\s+text\s+not\s+null/)
    expect(SQL).toMatch(/sender_id\s+text\s+not\s+null/)
    expect(SQL).toMatch(/deleted_by\s+text/)
  })

  it('mesajın kendi referansı (reply_to_id) uuid kalır', () => {
    expect(SQL).toMatch(/reply_to_id\s+uuid\s+references\s+public\.chat_messages/)
  })

  it('sohbet silinince katılım ve mesajlar da silinir (cascade)', () => {
    expect(SQL).toMatch(/conversation_id\s+uuid\s+not\s+null\s+references\s+public\.chat_conversations\(id\)\s+on delete cascade/)
    expect((SQL.match(/on delete cascade/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })
})
