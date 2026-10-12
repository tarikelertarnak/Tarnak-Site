import { describe, expect, it } from 'vitest'
import { canSeeAllPeers } from '@/lib/chat-access'
import { effectivePermissions, hasPermission } from '@/lib/permissions'

/**
 * KİM KİMİ GÖRÜR + NORMAL KULLANICININ SOHBET HAKKI (2026-10-12 kullanıcı isteği).
 *
 * Kullanıcı: "erişim yok ekranı diye bişey olmaz — sonuçta sadece
 * konuşabileceklerini görecek. Ben adminim, bütün grup ve kişileri görürüm."
 *
 * İki kural birlikte çalışır, ikisi de burada sabitlenir:
 *   1) liste kapsamı — sahip/admin → herkes, normal kullanıcı → yalnız sahip
 *      (`/api/chat/users` ve `action:'open'` AYNI kuralı kullanır),
 *   2) normal kullanıcı sahiple konuşabilmek için `chat.send`/`chat.read`
 *      iznine sahip olmalıdır (boş izin listesi yüzünden 403 "Sohbet iznin yok."
 *      alıyordu).
 */
describe('chat-access · kişi listesi kapsamı', () => {
  it('admin HERKESİ görür', () => {
    expect(canSeeAllPeers({ role: 'admin', isOwner: false })).toBe(true)
  })

  it('site sahibi rolü "user" olsa bile HERKESİ görür', () => {
    expect(canSeeAllPeers({ role: 'user', isOwner: true })).toBe(true)
  })

  it('normal kullanıcı yalnız konuşabileceklerini görür', () => {
    expect(canSeeAllPeers({ role: 'user', isOwner: false })).toBe(false)
  })
})

describe('permissions · normal kullanıcı site sahibiyle sohbet edebilir', () => {
  it('"user" rolü chat.send + chat.read içerir', () => {
    const perms = effectivePermissions(['user'])
    expect(hasPermission(perms, 'chat.send')).toBe(true)
    expect(hasPermission(perms, 'chat.read')).toBe(true)
  })

  it('"user" rolü admin/panel yetkisi VERMEZ (sınır korunur)', () => {
    const perms = effectivePermissions(['user'])
    expect(hasPermission(perms, 'panel.admin')).toBe(false)
    expect(hasPermission(perms, 'users.view')).toBe(false)
  })

  it('"user" rolü dosya yükleme yetkisi vermez (o ayrı bir izin)', () => {
    expect(effectivePermissions(['user'])).not.toContain('files.upload')
  })

  it('admin her zaman tüm izinlere sahiptir (koruma bozulmadı)', () => {
    expect(hasPermission(effectivePermissions(['admin']), 'panel.admin')).toBe(true)
  })
})
