import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * "Kişisel Bilgiler" kartı hizası (2026-10-12).
 *
 * KULLANICI ŞİKAYETİ: "etiketler farklı genişlikte olduğu için değerler farklı
 * yatay noktalardan başlıyor, kopyala ikonları satırdan satıra farklı konumda,
 * sağ sütunda 3. satır boş, e-posta kesiliyor."
 *
 * ÇÖZÜM (kaynak sözleşmesi olarak sabitlendi):
 *   · Her satır ÜÇ KOLONLU grid: `[etiket | değer | kopyala]`
 *     → etiket en az 90px, değerler aynı x'ten başlar, ikonlar aynı dikey
 *       çizgide (satırın sağında) durur.
 *   · `min-h-[44px]` → satır yükseklikleri ve alt çizgiler eşit.
 *   · Değerde `truncate` YOK, `break-all` VAR → e-posta `...` ile kesilmez.
 *   · E-posta `sm:col-span-2` → sağ sütunda boş hücre kalmaz.
 *
 * Neden kaynak sözleşmesi: kart, `BentoBox` + `useT()` + sunucu içeriği isteyen
 * istemci bileşeninin içinde; jsdom'da tek başına render edilemiyor (aynı
 * desen `hero-section.order.test.ts`'te de kullanılıyor).
 */

const SRC = readFileSync(
  join(process.cwd(), 'src/components/sections/about-section.tsx'),
  'utf8',
)
// Yorumlar ayıklanır: InfoRow'un açıklaması eski `truncate` davranışını
// (kaldırıldığını anlatırken) anıyor; test koda bakar.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
// SADECE InfoRow gövdesi: dosyada sonraki bileşenler (CopyValueButton vb.)
// kendi `truncate` sınıflarını taşıyor, karışmasın.
const ROW_START = CODE.indexOf('function InfoRow')
const ROW_END = CODE.indexOf('function ', ROW_START + 17)
const ROW = CODE.slice(ROW_START, ROW_END > 0 ? ROW_END : undefined)

describe('hakkımda · Kişisel Bilgiler kartı hizası (2026-10-12)', () => {
  it('infoRow üç kolonlu grid: etiket | değer | kopyala', () => {
    expect(ROW).toContain('grid-cols-[minmax(90px,auto)_minmax(0,1fr)_auto]')
    expect(ROW).toContain('items-center')
    expect(ROW).toContain('min-h-[44px]')
    // Kopyala düğmesi 3. kolonda satırın sağına yapışır (tüm satırlarda aynı x)
    expect(ROW).toContain('justify-self-end')
  })

  it('değer kesilmez (`truncate` yok), gerekirse alta kırılır (`break-all`)', () => {
    expect(ROW).toContain('break-all')
    expect(ROW).not.toContain('truncate')
  })

  it('e-posta iki kolon boyunca uzar (sağ sütunda boş satır kalmaz)', () => {
    // Kart kabuğu da `sm:col-span-2` içeriyor; aranan şey InfoRow'un
    // className PROP'u — tam eşleşme, tek kullanım.
    expect((SRC.match(/className="sm:col-span-2"/g) ?? []).length).toBe(1)
    const emailIdx = SRC.indexOf('about.infoEmail')
    expect(SRC.slice(emailIdx - 200, emailIdx)).toContain('className="sm:col-span-2"')
  })

  it('kart içi boşluklar 4/8px katı (grid gap ve satır paddingi)', () => {
    expect(CODE).toContain('gap-x-8')
    expect(CODE).toContain('sm:gap-6')
    expect(CODE).toContain('mt-2')
    expect(ROW).toContain('py-2')
    // Eski `gap-y-0` / `mt-1` kalıntısı kalmasın
    expect(CODE).not.toContain('gap-y-0')
  })
})
