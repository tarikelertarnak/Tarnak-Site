import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Proje sıralama kaynak-sözleşmesi — 2026-10-10.
 *
 * BUG (bulundu ve düzeltildi): `projects-grid.tsx` → `score()` içindeki
 * `switch (sort)` bloğunda `default:` case'i `case 'stars'` ve `case 'forks'`
 * satırlarından ÖNCE geliyordu. JavaScript'te `default` nerede olursa olsun
 * İLK eşleşmede çalıştığı için `score()` her koşulda `0` dönüyordu:
 *
 *   - "Yıldıza göre"  → hiç sıralamıyordu
 *   - "Fork'a göre"   → hiç sıralamıyordu
 *
 * Kullanıcı hata mesajı görmeden liste yerinde duruyordu (sessiz bozuk özellik).
 * `eslint` `default-case-last` kuralıyla yakaladı.
 *
 * Neden kaynak sözleşmesi: sıralama `useMemo` içinde, `SearchableCombobox`
 * üzerinden erişiliyor — render testi için ağır bir widget harness'ı
 * gerekiyordu. Oysa hatanın kendisi bir KOD YAPISI hatası ve kaynakta doğrudan
 * okunabiliyor. Repo'da aynı desen var (`no-hash-links.test.ts`,
 * `vcard-qr-only.test.ts`).
 *
 * Negatif kontrol: `default:` yeniden case'lerin arasına/alttan çekilirse
 * test KIRILIR.
 */
const FILE = join(process.cwd(), 'src/components/projects/projects-grid.tsx')

function scoreSwitch(): string {
  // Satır sonları normalize edilir: prettier/eslint CRLF<->LF dönüşümü yapıyor,
  // test bunun TIKANMAMALI (satır sonuna göre kırılganlık = kırık regresyon testi).
  const src = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
  const start = src.indexOf('const score = (p: ProjectItem): number =>')
  expect(start, 'score() bulunamadı').toBeGreaterThan(-1)
  // score() govdesi, `switch`in kapanışından ve `return 0` satirindan sonra
  // biter. En guvenli sinir: score() satirindan sonraki ilk `    }` (4 bosluk
  // girintili fonksiyon kapanisi) — ic ice switch'ler 8/10 bosluk girintili.
  const tail = src.slice(start)
  const endRel = tail.indexOf('\n    }')
  expect(endRel, 'score() kapanışı bulunamadı').toBeGreaterThan(-1)
  return src.slice(start, start + endRel)
}

describe('projectsGrid score() switch yapısı', () => {
  const block = scoreSwitch()

  it('default: case SONUNDA (eslint default-case-last kuralının kaynak karşılığı)', () => {
    const defIdx = block.indexOf('default:')
    expect(defIdx, 'score() içinde default: yok').toBeGreaterThan(-1)
    // default: sonrasında başka bir case olmamalı
    const after = block.slice(defIdx + 'default:'.length)
    expect(after).not.toMatch(/\bcase\s+['"]/)
  })

  it('stars ve forks case\'leri default: önce gelir (sıralama gerçekten çalışsın)', () => {
    const defIdx = block.indexOf('default:')
    const starsIdx = block.indexOf('case \'stars\':')
    const forksIdx = block.indexOf('case \'forks\':')
    expect(starsIdx, 'case \'stars\' yok').toBeGreaterThan(-1)
    expect(forksIdx, 'case \'forks\' yok').toBeGreaterThan(-1)
    expect(starsIdx).toBeLessThan(defIdx)
    expect(forksIdx).toBeLessThan(defIdx)
  })

  it('score() stars için p.stars, forks için p.forks döndürür', () => {
    const starsIdx = block.indexOf('case \'stars\':')
    const forksIdx = block.indexOf('case \'forks\':')
    const afterStars = block.slice(starsIdx, starsIdx + 200)
    const afterForks = block.slice(forksIdx, forksIdx + 200)
    expect(afterStars).toContain('p.stars')
    expect(afterForks).toContain('p.forks')
  })
})
