import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * DOSYA YÜKLEME GÜVENLİĞİ (2026-10-12 kullanıcı isteği).
 *
 * Kullanıcı: "Bu dosya türü yüklenemez gibi sorunlar olmasın önlem alsın; bir
 * kodsa da çalıştırmaz yani dosya çalışmaz, sadece var olur."
 *
 * Kural: desteklenmeyen VEYA içeriği uzantısıyla uyuşmayan her dosya `.bin`
 * olarak (opak, çalıştırılamaz) saklanır; hata dönmez. Çalışabilirliği
 * imkânsız kılan asıl kapı sunucu başlıklarıdır: `/uploads/*` indirmeye
 * zorlanır ve MIME koklanmaz.
 *
 * Neden kaynak sözleşmesi: `saveUploadedFile` diske yazar (testte `public/`
 * altına artık dosya bırakmak yasak), karar mantığı ise 3 satırdır; sözleşme
 * testi kararı ve başlık kapısını deterministik doğrular.
 */
const LIB = readFileSync(join(process.cwd(), 'src/lib/chat.ts'), 'utf8')
const CONFIG = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf8')

describe('dosya yükleme · dosya çalışmaz, yalnız var olur', () => {
  it('desteklenmeyen/uyuşmayan içerik HATA VERMEZ, .bin olarak saklanır', () => {
    expect(LIB).not.toContain('Bu dosya türü yüklenemez.')
    expect(LIB).not.toContain('Dosya içeriği uzantısıyla eşleşmiyor.')
    expect(LIB).toMatch(/const known = ALLOWED_EXTENSIONS\.has\(rawExt\) && matchesMagicBytes/)
    expect(LIB).toMatch(/const ext = known \? rawExt : '\.bin'/)
  })

  it('bilinmeyen içeriğin türü application/octet-stream olur (görsel/ses diye render edilmez)', () => {
    expect(LIB).toMatch(
      /const type = known \? \(mimeType \|\| 'application\/octet-stream'\) : 'application\/octet-stream'/,
    )
  })

  it('/uploads/* indirmeye zorlanır ve MIME koklanmaz (tarayıcı ÇALIŞTIRAMAZ)', () => {
    expect(CONFIG).toContain('source: \'/uploads/:path*\'')
    expect(CONFIG).toMatch(/Content-Disposition[\s\S]{0,80}attachment/)
    expect(CONFIG).toMatch(/X-Content-Type-Options[\s\S]{0,80}nosniff/)
  })

  it('beyaz listede çalıştırılabilir uzantı YOK (.js/.html/.svg/.xml)', () => {
    const start = LIB.indexOf('const ALLOWED_EXTENSIONS')
    const end = LIB.indexOf('const MAGIC_BYTES')
    expect(start).toBeGreaterThan(-1)
    const block = LIB.slice(start, end)
    for (const dangerous of ['.js', '.mjs', '.cjs', '.html', '.htm', '.svg', '.xml', '.xhtml']) {
      expect(block, `${dangerous} beyaz listede olmamalı`).not.toContain(`'${dangerous}'`)
    }
  })
})
