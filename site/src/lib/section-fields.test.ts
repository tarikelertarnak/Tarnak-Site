import { describe, expect, it } from 'vitest'
import { parsePhase6 } from '@/lib/phase6'
import { SECTION_SPECS } from '@/lib/section-fields'

/**
 * Ek bölümler admin editörü alan tanımları.
 *
 * Editör "spec'ten çalışıyor" — yani alan tanımı ile gerçek şema
 * arasındaki uyumsuzluk kullanıcıya boş form olarak döner. Burada
 * ikisinin hizalı olduğunu ölçüyoruz.
 */
describe('sectionSpecs', () => {
  it('şemadaki her üst alanın karşılığı var', () => {
    // `phase6Schema` üst anahtarları — boş nesiyle parse edip alıyoruz.
    const ornek = {
      availability: { enabled: true, label: 'x', tone: 'busy', href: '/x' },
      services: { title: 't', description: 'd', items: [] },
      testimonials: { title: 't', items: [] },
      timeline: { title: 't', items: [] },
      certificates: { title: 't', items: [] },
      uses: { title: 't', description: 'd', groups: [] },
      now: {
        updated: '2026-10',
        learning: [],
        building: [],
        reading: [],
        listening: [],
      },
      changelog: { title: 't', entries: [] },
      newsletter: {
        enabled: false,
        title: 't',
        description: 'd',
        provider: '',
      },
      videos: { channelId: '', title: 't', maxItems: 4 },
      vcard: { enabled: true, note: '' },
      privacy: { title: 't', updated: '', body: '', needsLegalReview: true },
      kvkk: { title: 't', updated: '', body: '', needsLegalReview: true },
    }
    const cozulmus = parsePhase6(ornek)
    expect(cozulmus).not.toBeNull()

    const specAnahtarlari = SECTION_SPECS.map(b => b.anahtar).sort()
    const semaAnahtarlari = Object.keys(ornek).sort()
    expect(specAnahtarlari).toEqual(semaAnahtarlari)
  })

  it('her bölümün başlığı var (kart boş görünmesin)', () => {
    for (const b of SECTION_SPECS) {
      expect(b.baslik.length).toBeGreaterThan(0)
      expect(b.anahtar.length).toBeGreaterThan(0)
    }
  })

  it('her alanın etiketi var', () => {
    for (const b of SECTION_SPECS) {
      for (const a of b.alanlar ?? []) {
        expect(a.etiket.length).toBeGreaterThan(0)
      }
      for (const a of b.liste?.cocuk ?? []) {
        expect(a.etiket.length).toBeGreaterThan(0)
      }
    }
  })

  it('select alanlarının seçenekleri şemadaki enum ile aynı', () => {
    const availability = SECTION_SPECS.find(
      b => b.anahtar === 'availability',
    )
    const tone = availability?.alanlar?.find(a => a.anahtar === 'tone')
    // phase6.ts: z.enum(['available', 'busy', 'offline'])
    expect(tone?.secenekler).toEqual(['available', 'busy', 'offline'])
  })

  it('duplicate anahtar yok', () => {
    const anahtarlar = SECTION_SPECS.map(b => b.anahtar)
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length)
  })
})
