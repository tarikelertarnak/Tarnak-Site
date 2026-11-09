import { describe, expect, it } from 'vitest'
import {
  applyOverrides,
  basePermissions,
  toggleOverride,
} from '@/components/admin/permission-editor'
import { effectivePermissions } from '@/lib/permissions'

/**
 * "Özel Yetkiler" editörünün çekirdek mantığı.
 *
 * Kritik kural: override YALNIZCA varsayılandan sapan yetkiler için yazılır.
 * "Varsayılana dön" = anahtarı silmek. Böylece kayıt küçük kalır ve ileride
 * eklenen yeni varsayılan yetkiler kendiliğinden geçerli olur.
 */

describe('basePermissions', () => {
  it('normal kullanıcıda varsayılan açık yetkiler tabandır', () => {
    const base = basePermissions(['user'])
    expect(base.has('files.upload')).toBe(true)
    expect(base.has('chat.send')).toBe(true)
    expect(base.has('blog.create')).toBe(false)
    expect(base.has('panel.admin')).toBe(false)
  })

  it('rol, varsayılanı GENİŞLETİR (kapalı bir yetkiyi açar)', () => {
    expect(basePermissions(['trustworthy']).has('location.view')).toBe(true)
    expect(basePermissions(['user']).has('location.view')).toBe(false)
  })

  it('admin tüm yetkilere sahiptir', () => {
    const base = basePermissions(['admin'])
    expect(base.has('panel.admin')).toBe(true)
    expect(base.has('users.delete')).toBe(true)
  })
})

describe('toggleOverride', () => {
  it('varsayılana EŞİT hedef override YAZMAZ', () => {
    const base = basePermissions(['user'])
    // files.upload varsayılan açık; açık bırakmak için override gerekmez.
    expect(toggleOverride({}, base, 'files.upload', true)).toEqual({})
    // blog.create varsayılan kapalı; kapalı bırakmak için override gerekmez.
    expect(toggleOverride({}, base, 'blog.create', false)).toEqual({})
  })

  it('varsayılandan SAPAN hedef override yazar', () => {
    const base = basePermissions(['user'])
    expect(toggleOverride({}, base, 'files.upload', false)).toEqual({
      'files.upload': false,
    })
    expect(toggleOverride({}, base, 'blog.create', true)).toEqual({
      'blog.create': true,
    })
  })

  it('geri almak (varsayılana dönmek) anahtarı SİLER', () => {
    const base = basePermissions(['user'])
    const off = toggleOverride({}, base, 'files.upload', false)
    expect(toggleOverride(off, base, 'files.upload', true)).toEqual({})
  })
})

describe('applyOverrides', () => {
  it('true ekler, false çıkarır', () => {
    const base = basePermissions(['user'])
    const eff = applyOverrides(base, { 'files.upload': false, 'blog.create': true })
    expect(eff.has('files.upload')).toBe(false)
    expect(eff.has('blog.create')).toBe(true)
  })

  it('sunucudaki effectivePermissions ile AYNI sonucu üretir', () => {
    const overrides = { 'files.upload': false, 'blog.create': true, 'chat.send': false }
    const ui = [...applyOverrides(basePermissions(['user']), overrides)].sort()
    const server = effectivePermissions(['user'], [], overrides).sort()
    expect(ui).toEqual(server)
  })

  it('admin override ile yetki kaybetmez', () => {
    const eff = applyOverrides(
      basePermissions(['admin']),
      { 'panel.admin': false },
      ['admin'],
    )
    // Sunucu admin'i dokunulmaz sayar — arayüz de aynı göstermeli.
    expect(eff.has('panel.admin')).toBe(true)
  })
})
