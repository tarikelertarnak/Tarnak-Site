import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 2026-10-20 — CV seçici (çok kayıt dalı) davranış sözleşmesi:
 *  1) "Görüntüle" YENİ SEKMEDE açmaz (kullanıcı: "yeni sekmede açmasın").
 *  2) İndirme ikonu gerçekten indirir (`download`) — görüntüleme ve indirme
 *     ayrı öğelerdir, tek `<a>` ikisini birden yapamaz.
 *
 * Kaynak sözleşmesi (vcard-qr-only.test.ts ile aynı desen): bileşeni render
 * etmek sağlayıcı mock'ları gerektiriyor; kaynak metni davranışın kendisidir.
 */
describe('cv-picker — görüntüle/indir ayrımı', () => {
  const src = readFileSync(
    join(process.cwd(), 'src/components/ui/cv-picker.tsx'),
    'utf8',
  )

  it('`target=_blank` yok — görüntüleme aynı sekmede', () => {
    expect(src).not.toContain('target: \'_blank\'')
    expect(src).not.toContain('target="_blank"')
  })

  it('combobox indirme linki `download` taşır', () => {
    expect(src).toMatch(/href=\{c\.href\}\s+download\b/)
  })
})
