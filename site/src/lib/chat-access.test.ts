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

  it('"user" rolü VARSAYILAN olarak dosya yükleme + proje görüntüleme alır', () => {
    /*
      2026-10-17 kullanıcı isteği: "İzin verilmesi gereken yetkiler açık
      olmalı." Normal üyenin kendi işini görmesi için gereken yetkiler
      (`files.upload`, `files.view`, `projects.view`) artık varsayılan AÇIK;
      eski test bunun tersini sabitliyordu.
    */
    const perms = effectivePermissions(['user'])
    expect(perms).toContain('files.upload')
    expect(perms).toContain('files.view')
    expect(perms).toContain('projects.view')
  })

  it('tehlikeli yetkiler normal kullanıcıda kapalı kalır', () => {
    const perms = effectivePermissions(['user'])
    for (const id of [
      'files.delete',
      'chat.delete',
      'users.manage',
      'users.delete',
      'panel.admin',
      'panel.settings',
      'blog.delete',
      'projects.delete',
      'location.view',
    ]) {
      expect(perms).not.toContain(id)
    }
  })

  it('override varsayılanı EZER: hem kapatır hem açar', () => {
    // Varsayılan açık olan bir yetki kapatılabilir.
    expect(
      effectivePermissions(['user'], [], { 'files.upload': false }),
    ).not.toContain('files.upload')
    // Varsayılan kapalı olan bir yetki açılabilir.
    expect(
      effectivePermissions(['user'], [], { 'blog.create': true }),
    ).toContain('blog.create')
  })

  it('override yoksa varsayılan geçerlidir (boş nesne = varsayılan)', () => {
    expect(effectivePermissions(['user'], [], {})).toContain('files.upload')
  })

  it('eski `permissions[]` biçimi hâlâ okunur (geriye dönük)', () => {
    expect(effectivePermissions(['user'], ['blog.edit'])).toContain('blog.edit')
  })

  it('admin override ile yetki kaybetmez (koruma bozulmadı)', () => {
    const perms = effectivePermissions(['admin'], [], { 'panel.admin': false })
    expect(perms).toContain('panel.admin')
  })

  it('admin her zaman tüm izinlere sahiptir (koruma bozulmadı)', () => {
    expect(hasPermission(effectivePermissions(['admin']), 'panel.admin')).toBe(true)
  })
})
