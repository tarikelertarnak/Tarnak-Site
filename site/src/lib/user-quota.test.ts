import type { UploadQuota } from '@/lib/user-quota'
import { describe, expect, it } from 'vitest'
import { formatMb } from '@/lib/admin/users-shared'
import { quotaError } from '@/lib/user-quota'

/**
 * Kota zorlaması (sunucu tarafı). Kullanıcı isteği: "1 MB'ı aşan yükleme
 * reddedilsin", "Dosya yükleme kotası doldu (kullanılan 0,8 MB / 1 MB)".
 */

function quota(usedBytes: number, limitBytes: number | null, unlimited = false): UploadQuota {
  return { unlimited, limitBytes, usedBytes }
}

describe('quotaError', () => {
  it('kota dolmadıysa hata yok', () => {
    expect(quotaError(quota(0, 1_048_576), 100)).toBeNull()
  })

  it('toplam LIMITI aşan yükleme reddedilir ve mesaj kullanılan/limit gösterir', () => {
    const used = 838_861 // 0,8 MB
    const msg = quotaError(quota(used, 1_048_576), 400_000)
    expect(msg).not.toBeNull()
    expect(msg).toContain(formatMb(used))
    expect(msg).toContain(formatMb(1_048_576))
    expect(msg).toContain('kota')
  })

  it('tam sınırda kabul edilir, 1 bayt aşınca reddedilir (sınır kontrolü)', () => {
    expect(quotaError(quota(1_000_000, 1_048_576), 48_576)).toBeNull()
    expect(quotaError(quota(1_000_000, 1_048_576), 48_577)).not.toBeNull()
  })

  it('sınırsız kotada (admin/site sahibi) hiç engellemez', () => {
    expect(quotaError(quota(9_999_999, 0, true), 10_485_760)).toBeNull()
  })

  it('kullanıcıya özel `null` limit = sınırsız', () => {
    expect(quotaError(quota(9_999_999, null), 10_485_760)).toBeNull()
  })

  it('mesaj bağlamında anlaşılır metin döner', () => {
    const msg = quotaError(quota(1_048_576, 1_048_576), 1, 'message')
    expect(msg).toContain('Mesaj gönderilemedi')
  })
})
