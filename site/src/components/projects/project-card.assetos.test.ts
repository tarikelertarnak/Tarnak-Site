import { describe, expect, it } from 'vitest'

import { assetOS, releaseOptions } from '@/components/projects/project-card'

/**
 * Sürüm seçici (indirme dropdown'ı) — asset sınıflandırma regresyonu.
 *
 * 2026-10-21 canlı hata: `ActivaterWindows`'un v2.5.0 `.cmd`/`.ps1` asset'leri
 * "Other" grubuna düşüyordu çünkü `assetOS` yalnızca `.exe`'yi Windows sayıyordu.
 * Sonuç: en yeni sürümler Windows altında hiç görünmüyor, "Latest" yanlışlıkla
 * eski `.exe`'yi gösteriyordu. Test bunu negatif kontrole kilitler.
 */
describe('assetOS — platform sınıflandırma', () => {
  it('windows scriptlerini Windows sayar (.cmd/.bat/.ps1/.msi/.msix)', () => {
    expect(assetOS('ActivaterWindows.cmd')).toBe('windows')
    expect(assetOS('ActivaterWindows.ps1')).toBe('windows')
    expect(assetOS('setup.bat')).toBe('windows')
    expect(assetOS('installer.msi')).toBe('windows')
    expect(assetOS('app.msix')).toBe('windows')
    expect(assetOS('ActivaterWindows.exe')).toBe('windows')
  })

  it('diğer platformları tanır', () => {
    expect(assetOS('App.dmg')).toBe('macos')
    expect(assetOS('App.AppImage')).toBe('linux')
    expect(assetOS('App.deb')).toBe('linux')
    expect(assetOS('App.apk')).toBe('android')
  })

  it('bilinmeyen (zip/yml) OS olmadan döner', () => {
    expect(assetOS('source.zip')).toBeUndefined()
    expect(assetOS('latest.yml')).toBeUndefined()
  })
})

describe('releaseOptions — sürüm etiketleri', () => {
  it('her asset için "tag — ad" etiketi üretir ve scriptleri Windows gruplar', () => {
    const releases = [
      {
        tagName: 'v2.5.0',
        assets: [
          { name: 'ActivaterWindows.cmd', downloadUrl: 'u1' },
          { name: 'ActivaterWindows.ps1', downloadUrl: 'u2' },
        ],
      },
    ]
    const opts = releaseOptions(releases)
    expect(opts).toHaveLength(2)
    expect(opts[0]).toMatchObject({
      label: 'v2.5.0 — ActivaterWindows.cmd',
      os: 'windows',
      version: 'v2.5.0',
    })
    expect(opts[1].os).toBe('windows')
  })

  it('source zip → Other (isZip), Windows değil', () => {
    const opts = releaseOptions([
      {
        tagName: 'v1.0.0',
        assets: [{ name: 'Source code (zip)', downloadUrl: 'z' }],
      },
    ])
    expect(opts[0]).toMatchObject({ label: 'v1.0.0 — Source (zip)', isZip: true })
    expect(opts[0].os).toBeUndefined()
  })
})
