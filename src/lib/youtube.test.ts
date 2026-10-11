import { describe, expect, it } from 'vitest'
import { gecerliKanalId, parseKanalBesleme } from '@/lib/youtube'

/**
 * YouTube besleme ayrıştırıcı (Faz 6 · 3).
 *
 * Kanal beslemesi Atom 1.0'dır. Örnek şekil gerçek
 * `youtube.com/feeds/videos.xml` çıktısının kısaltılmış hâlidir —
 * parser'ın gerçek yapıyla uyumunu ölçmek için kullanılıyor.
 */
const ORNEK = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"
      xmlns:media="http://search.yahoo.com/mrss/"
      xmlns="http://www.w3.org/2005/Atom">
  <title>Örnek Kanal</title>
  <entry>
    <id>yt:video:AAA111</id>
    <yt:videoId>AAA111</yt:videoId>
    <title><![CDATA[İlk video &amp; test]]></title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=AAA111"/>
    <published>2026-01-15T10:00:00+00:00</published>
    <media:group>
      <media:thumbnail url="https://i.ytimg.com/vi/AAA111/hqdefault.jpg"
                      width="480" height="360"/>
    </media:group>
  </entry>
  <entry>
    <id>yt:video:BBB222</id>
    <yt:videoId>BBB222</yt:videoId>
    <title>İkinci video</title>
    <published>2026-02-20T08:30:00+00:00</published>
    <media:thumbnail url="https://i.ytimg.com/vi/BBB222/hqdefault.jpg"
                    width="480" height="360"/>
  </entry>
  <entry>
    <id>yt:video:CCC333</id>
    <yt:videoId>CCC333</yt:videoId>
    <title>Üçüncü video</title>
    <published>2026-03-01T12:00:00+00:00</published>
  </entry>
</feed>`

describe('parseKanalBesleme', () => {
  it('videoları besleme sırasıyla çıkarır', () => {
    expect(parseKanalBesleme(ORNEK).map(v => v.id)).toEqual([
      'AAA111',
      'BBB222',
      'CCC333',
    ])
  })

  it('watch URL üretir', () => {
    expect(parseKanalBesleme(ORNEK)[0].url).toBe(
      'https://www.youtube.com/watch?v=AAA111',
    )
  })

  it('cDATA ve entity temizlenir', () => {
    // <![CDATA[İlk video &amp; test]]> -> "İlk video & test"
    expect(parseKanalBesleme(ORNEK)[0].baslik).toBe('İlk video & test')
  })

  it('tarih ve kapak görselini okur', () => {
    const ilk = parseKanalBesleme(ORNEK)[0]
    expect(ilk.tarih).toBe('2026-01-15T10:00:00+00:00')
    expect(ilk.kapak).toBe('https://i.ytimg.com/vi/AAA111/hqdefault.jpg')
  })

  it('enFazla sınırını uygular', () => {
    expect(parseKanalBesleme(ORNEK, 2)).toHaveLength(2)
    expect(parseKanalBesleme(ORNEK, 1)).toHaveLength(1)
  })

  it('kapak yoksa alan boş kalır (uydurmaz)', () => {
    expect(parseKanalBesleme(ORNEK)[2].kapak).toBeUndefined()
  })

  it('videoId olmayan entry atlanır', () => {
    expect(
      parseKanalBesleme('<feed><entry><title>idsiz</title></entry></feed>'),
    ).toEqual([])
  })

  it('bozuk/boş XML hata fırlatmaz, boş dizi döner', () => {
    expect(() => parseKanalBesleme('')).not.toThrow()
    expect(parseKanalBesleme('')).toEqual([])
    expect(parseKanalBesleme('<html>404</html>')).toEqual([])
    expect(parseKanalBesleme('<?xml version="1.0"?><feed></feed>')).toEqual([])
  })
})

describe('gecerliKanalId', () => {
  it('uC ile başlayan gerçek kimliği kabul eder', () => {
    expect(gecerliKanalId('UC_ORNEK_KANAL_IDENTIFIYER_0001')).toBe(true)
  })

  it('boş ve tanımsız değerleri reddeder', () => {
    expect(gecerliKanalId('')).toBe(false)
    expect(gecerliKanalId('   ')).toBe(false)
    expect(gecerliKanalId(undefined)).toBe(false)
    expect(gecerliKanalId(null)).toBe(false)
  })

  it('yanlış öneki ve kısa kimliği reddeder', () => {
    expect(gecerliKanalId('https://youtube.com/@kanal')).toBe(false)
    expect(gecerliKanalId('UC123')).toBe(false)
  })
})
