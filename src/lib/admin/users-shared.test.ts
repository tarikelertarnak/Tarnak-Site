import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAX_TOTAL_UPLOAD_BYTES,
  effectivePermissionIds,
  formatMb,
  isUnlimited,
  overrideCount,
  resolveLimits,
} from '@/lib/admin/users-shared'
import { effectivePermissions } from '@/lib/permissions'

/**
 * Kullanıcı limitleri + yetki override modeli (2026-10-17).
 *
 * Kritik ayrımlar burada sabitlenir:
 *   · limit YOK = varsayılan (1 MB); `null` = SINIRSIZ; `0` = her şeyi keser.
 *   · override yalnız varsayılandan sapanı tutar.
 *   · admin/site sahibi kotasız.
 */

describe('resolveLimits', () => {
  it('kayıt yoksa 1 MB yükleme + sınırsız mesaj', () => {
    const r = resolveLimits({})
    expect(r.maxTotalUploadBytes).toBe(DEFAULT_MAX_TOTAL_UPLOAD_BYTES)
    expect(r.maxTotalUploadBytes).toBe(1_048_576)
    expect(r.maxMessages).toBeNull()
  })

  it('`null` bilinçli SINIRSIZ demektir, varsayılana düşmez', () => {
    expect(resolveLimits({ maxTotalUploadBytes: null }).maxTotalUploadBytes).toBeNull()
    expect(resolveLimits({ maxMessages: null }).maxMessages).toBeNull()
  })

  it('`0` sınırsız DEĞİLDİR — korunur', () => {
    expect(resolveLimits({ maxTotalUploadBytes: 0 }).maxTotalUploadBytes).toBe(0)
    expect(resolveLimits({ maxMessages: 0 }).maxMessages).toBe(0)
  })

  it('elle verilmiş değer korunur', () => {
    expect(resolveLimits({ maxTotalUploadBytes: 5_242_880 }).maxTotalUploadBytes)
      .toBe(5_242_880)
    expect(resolveLimits({ maxMessages: 42 }).maxMessages).toBe(42)
  })

  it('bozuk değer (negatif / metin) varsayılana döner', () => {
    expect(resolveLimits({ maxTotalUploadBytes: -5 }).maxTotalUploadBytes)
      .toBe(DEFAULT_MAX_TOTAL_UPLOAD_BYTES)
    expect(resolveLimits({ maxTotalUploadBytes: 'abc' }).maxTotalUploadBytes)
      .toBe(DEFAULT_MAX_TOTAL_UPLOAD_BYTES)
  })
})

describe('isUnlimited', () => {
  it('site sahibi ve admin kotasız', () => {
    expect(isUnlimited({ isOwner: true, roles: [] })).toBe(true)
    expect(isUnlimited({ isOwner: false, roles: ['admin'] })).toBe(true)
  })

  it('normal kullanıcı kotaya tabi', () => {
    expect(isUnlimited({ isOwner: false, roles: ['user'] })).toBe(false)
    expect(isUnlimited(null)).toBe(false)
  })
})

describe('formatMb', () => {
  it('türkçe ondalık virgülle biçimler', () => {
    expect(formatMb(1_048_576)).toBe('1 MB')
    expect(formatMb(419_430)).toBe('0,4 MB')
    expect(formatMb(0)).toBe('0 MB')
  })
})

describe('overrideCount', () => {
  it('yalnız kaydedilmiş ayarları sayar', () => {
    expect(overrideCount({})).toBe(0)
    expect(overrideCount({ 'files.upload': false })).toBe(1)
    expect(overrideCount({ 'files.upload': false, 'blog.create': true })).toBe(2)
  })
})

describe('effectivePermissionIds', () => {
  it('varsayılanları içerir, override ile kapatır/açar', () => {
    const base = effectivePermissionIds(['chat.send', 'chat.read'], {})
    expect(base).toContain('files.upload')
    expect(base).not.toContain('blog.create')

    const off = effectivePermissionIds(['chat.send'], { 'files.upload': false })
    expect(off).not.toContain('files.upload')

    const on = effectivePermissionIds(['chat.send'], { 'blog.create': true })
    expect(on).toContain('blog.create')
  })

  it('sunucudaki effectivePermissions ile AYNI sonucu verir', () => {
    const overrides = { 'files.upload': false, 'blog.create': true }
    const a = effectivePermissionIds(['chat.send', 'chat.read'], overrides, ['user'])
    const b = effectivePermissions(['user'], [], overrides)
    expect([...a].sort()).toEqual([...b].sort())
  })

  it('admin rolü her zaman tüm yetkilere sahiptir', () => {
    const perms = effectivePermissionIds([], { 'panel.admin': false }, ['admin'])
    expect(perms).toContain('panel.admin')
  })
})
