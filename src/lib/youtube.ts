/**
 * YouTube kanal videoları (Faz 6 · 3).
 *
 * Neden RSS: YouTube Data API için anahtar + kota gerekir; kanal
 * RSS beslemesi (`youtube.com/feeds/videos.xml?channel_id=...`) anahtarsız
 * çalışır ve Workers kenarında tek bir GET ile okunur.
 *
 * Kural (ortak kural dosyası): içerik UYDURULMAZ. `channelId` boşsa veya
 * besleme hata verirse çağıran boş dizi alır ve bölümü gizler.
 */

export interface KanalVideosu {
  id: string
  baslik: string
  /** YouTube watch URL */
  url: string
  /** ISO tarih (YouTube `<published>`) */
  tarih?: string
  /** 16:9 kapak görseli */
  kapak?: string
}

const RSS_KOK = 'https://www.youtube.com'
const FEED_KALIB = `${RSS_KOK}/feeds/videos.xml`

/** Kanal ID doğrulaması — YouTube kanal ID'leri `UC` ile başlar. */
export function gecerliKanalId(id: string | undefined | null): boolean {
  return typeof id === 'string' && /^UC[\w-]{20,}$/.test(id.trim())
}

/**
 * Atom/RSS XML metninden videoları çıkarır.
 *
 * Kanal beslemesi Atom 1.0 (`youtube.com` formatı) döner: her video bir
 * `<entry>` içinde `<yt:videoId>`, `<title>`, `<published>` ve
 * `<media:thumbnail>` ile gelir.
 *
 * Kötü/boş XML HATA FIRLATMAZ — boş dizi döner. Çağıran bölümü gizler.
 */
export function parseKanalBesleme(xml: string, enFazla = 4): KanalVideosu[] {
  if (!xml || !xml.includes('<entry')) {
    return []
  }
  const entryler = xml.split('<entry>').slice(1)
  const videolar: KanalVideosu[] = []

  for (const entry of entryler) {
    if (videolar.length >= enFazla) {
      break
    }
    const id = etiketIcerigi(entry, 'yt:videoId')
    if (!id) {
      continue
    }
    videolar.push({
      id,
      baslik: etiketIcerigi(entry, 'title') || id,
      url: `${RSS_KOK}/watch?v=${id}`,
      tarih: etiketIcerigi(entry, 'published'),
      kapak: etiketAl(entry, 'media:thumbnail', 'url'),
    })
  }

  return videolar
}

/** `<etiket>deger</etiket>` → `deger` (CDATA ve entity'ler temizlenir). */
function etiketIcerigi(xml: string, etiket: string): string | undefined {
  const ac = `<${etiket}>`
  const bas = xml.indexOf(ac)
  if (bas === -1) {
    return undefined
  }
  const icerikBas = bas + ac.length
  const son = xml.indexOf(`</${etiket}>`, icerikBas)
  if (son === -1) {
    return undefined
  }
  return temizle(xml.slice(icerikBas, son))
}

/** `<etiket ... ozellik="deger" />` → `deger` */
function etiketAl(
  xml: string,
  etiket: string,
  ozellik: string,
): string | undefined {
  const re = new RegExp(`<${etiket}[^>]*\\s${ozellik}="([^"]*)"`)
  const m = xml.match(re)
  return m ? temizle(m[1]) : undefined
}

function temizle(deger: string): string {
  return deger
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .trim()
}

/** Kanalın video beslemesini çeker. Hata/boş kanal → boş dizi. */
export async function kanalVideolari(
  channelId: string | undefined | null,
  enFazla = 4,
): Promise<KanalVideosu[]> {
  if (!gecerliKanalId(channelId)) {
    return []
  }
  // `gecerliKanalId` true döndü → buraya `string` daraltması uygulanır.
  const id = String(channelId).trim()
  try {
    const yanit = await fetch(`${FEED_KALIB}?channel_id=${id}`, {
      headers: { accept: 'application/atom+xml, application/xml' },
      // Besleme her gün değişir; 1 saat yeterli.
      next: { revalidate: 3600 },
    })
    if (!yanit.ok) {
      return []
    }
    return parseKanalBesleme(await yanit.text(), enFazla)
  }
 catch {
    // Ağ hatası / kanal silinmiş — bölüm gizlensin, sayfa patlamasın.
    return []
  }
}
