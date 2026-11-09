import type { IconKind } from '@/lib/icon-kind'
/**
 * İkon çözümleyici — admin formundaki serbest metni SİTEDE GÖSTERİLEBİLİR
 * kanonik bir değere çevirir (2026-10-16, kullanıcı isteği).
 *
 * Girdi tipleri (bkz. `icon-kind.ts`): görsel URL · satır içi SVG · React/TSX
 * bileşeni · shadcn komutu · yerel yol · Iconify adı.
 *
 * Kanonik çıktı (veritabanına YAZILAN tek biçim):
 *   - `<svg …>`  → temizlenmiş SVG işaretlemesi
 *   - `/…`       → yerel yol
 *   - `data:image/…` → gömülü görsel
 *   - `http(s)://…`  → indirilemediyse orijinal adres (uyarıyla)
 *   - `logos:nextjs-icon` → Iconify adı
 *
 * SUNUCU TARAFI: `sanitizeSvg` ve ağ erişimi içerir, istemci paketine alma.
 */
import {
  detectIconKind,
  extractSvgFromTsx,
  shadcnRegistryFrom,
} from '@/lib/icon-kind'
import { sanitizeSvg } from '@/lib/svg-sanitize'

export interface IconResolveResult {
  ok: boolean
  /** Algılanan/seçilen tip (hata durumunda da dolu olabilir). */
  kind: IconKind | null
  /** Kaydedilecek kanonik değer. Hata durumunda boş. */
  icon: string
  /** Kullanıcıya gösterilecek uyarılar (işlem başarılı olsa bile). */
  warnings: string[]
  /** `ok:false` iken gösterilecek hata metni. */
  message?: string
}

/** `/uploads/…` gibi yerel yol: dizin atlama yok, görsel uzantılı. */
const LOCAL_PATH_RE = /^\/(?!.*\.\.)[\w./-]+\.(?:svg|png|jpe?g|webp|gif|avif)$/i
const ICONIFY_RE = /^[a-z0-9][a-z0-9-]*:[a-z0-9-]+$/i

/** shadcn kayıt sunucusu — SABİT ve izinli tek alan adı. */
const REGISTRY_HOST = 'icons0.dev'
const FETCH_TIMEOUT_MS = 8000
/** İndirilen görselin gömülebilir üst sınırı: üstünde adres korunur. */
const MAX_EMBED_BYTES = 256 * 1024
/** İndirilecek en büyük görsel (bellek koruması). */
const MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024

/** Özel/yerel adresler (SSRF): dışarıdan iç ağa istek yapılmasın. */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal'))
    return true
  // IPv4: 10/8, 127/8, 172.16-31/12, 192.168/16, 169.254/16, 0.0.0.0, 100.64/10
  const v4 = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(h)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    return (
      a === 0
      || a === 10
      || a === 127
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 169 && b === 254)
      || (a === 100 && b >= 64 && b <= 127)
    )
  }
  // IPv6: ::1, fc00::/7, fe80::/10
  if (h.includes(':'))
    return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe8')
  return false
}

/** Yalnızca http(s), kimlik bilgisi yok, standart portlar dışına çıkma. */
function assertSafeRemoteUrl(raw: string): URL {
  const url = new URL(raw)
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new Error('yalnız http/https')
  if (url.username || url.password)
    throw new Error('adreste kimlik bilgisi olamaz')
  if (url.port && url.port !== '80' && url.port !== '443')
    throw new Error('standart dışı port')
  if (isBlockedHost(url.hostname))
    throw new Error('yerel/özel adres engellendi')
  return url
}

/** Yönlendirme takip edilmez: iç adrese sıçrama (SSRF) engellenir. */
async function fetchGuarded(url: URL, accept: string): Promise<Response> {
  return await fetch(url, {
    headers: { accept },
    redirect: 'error',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
}

/**
 * Görsel adresini indirir: SVG ise temizlenmiş işaretleme, küçük raster ise
 * gömülü `data:` adresi döner. İndirilemezse `null` (çağıran orijinali korur).
 */
async function fetchIconUrl(
  rawUrl: string,
  warnings: string[],
): Promise<string | null> {
  let url: URL
  try {
    url = assertSafeRemoteUrl(rawUrl)
  }
  catch (e) {
    warnings.push(`Adres indirilemedi (${(e as Error).message}); orijinal adres korundu.`)
    return null
  }

  try {
    const res = await fetchGuarded(url, 'image/*,image/svg+xml;q=0.9,*/*;q=0.1')
    if (!res.ok) {
      warnings.push(`Görsel indirilemedi (HTTP ${res.status}); orijinal adres korundu.`)
      return null
    }

    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    const buf = new Uint8Array(await res.arrayBuffer())

    if (buf.byteLength > MAX_DOWNLOAD_BYTES) {
      warnings.push('Görsel 2 MB sınırını aştı; orijinal adres korundu.')
      return null
    }

    const isSvg = type === 'image/svg+xml' || /\.svg(?:$|\?)/i.test(url.pathname + url.search)
    if (isSvg) {
      const text = new TextDecoder().decode(buf)
      const clean = sanitizeSvg(text)
      if (!clean) {
        warnings.push('Adresteki SVG okunamadı; orijinal adres korundu.')
        return null
      }
      return clean
    }

    if (!type.startsWith('image/')) {
      warnings.push(`Adres bir görsel değil (${type || 'bilinmeyen tür'}); orijinal adres korundu.`)
      return null
    }

    // Raster: yalnızca küçükse gömülür. Büyük görseli base64 olarak sayfaya
    // gömmek yüklenme süresini bozar — harici adres daha iyidir.
    if (buf.byteLength > MAX_EMBED_BYTES) {
      warnings.push('Görsel 256 KB üzerinde; gömülmedi, orijinal adres korundu.')
      return null
    }

    let binary = ''
    for (const b of buf) binary += String.fromCharCode(b)
    return `data:${type};base64,${btoa(binary)}`
  }
  catch (e) {
    warnings.push(`Görsel indirilemedi (${(e as Error).message}); orijinal adres korundu.`)
    return null
  }
}

/** shadcn komutundan ikonu icons0 kayıt sunucusundan çeker (izinli tek host). */
async function fetchShadcnIcon(
  command: string,
): Promise<{ icon: string | null, message?: string }> {
  const name = shadcnRegistryFrom(command)
  if (!name)
    return { icon: null, message: 'shadcn komutundaki kayıt adı okunamadı.' }

  const url = new URL(`/r/${name}.json`, `https://${REGISTRY_HOST}/`)
  try {
    const res = await fetchGuarded(url, 'application/json')
    if (!res.ok) {
      return {
        icon: null,
        message: `Bu komutun içeriğini çekemedim (HTTP ${res.status}). İkonun SVG/TSX kodunu yapıştır.`,
      }
    }
    const body = (await res.json()) as {
      files?: { content?: string }[]
    }
    const contents = (body.files ?? [])
      .map(f => f.content ?? '')
      .filter(c => /<svg[\s>]/i.test(c))

    if (contents.length === 0)
      return { icon: null, message: 'Kayıt sunucusu bu ikon için SVG içerik döndürmedi.' }

    const clean = sanitizeSvg(extractSvgFromTsx(contents[0]) ?? contents[0])
    if (!clean)
      return { icon: null, message: 'Kayıttan gelen SVG temizlenemedi.' }

    return { icon: clean }
  }
  catch (e) {
    return {
      icon: null,
      message: `Bu komutun içeriğini çekemedim (${(e as Error).message}). İkonun SVG/TSX kodunu yapıştır.`,
    }
  }
}

/**
 * Serbest metni kanonik ikon değerine çevirir. `kind` verilirse algılama
 * atlanır (formdaki "Gelişmiş: ikon tipi" seçimi).
 */
export async function resolveIcon(
  raw: string,
  kind?: IconKind | null,
): Promise<IconResolveResult> {
  const text = raw.trim()
  if (!text)
    return { ok: false, kind: null, icon: '', warnings: [], message: 'İkon boş.' }

  const detected = kind ?? detectIconKind(text)
  const warnings: string[] = []

  switch (detected) {
    case 'svg': {
      const clean = sanitizeSvg(text)
      if (!clean)
        return { ok: false, kind: 'svg', icon: '', warnings, message: 'SVG okunamadı (geçersiz işaretleme).' }
      return { ok: true, kind: 'svg', icon: clean, warnings }
    }

    case 'tsx': {
      const svg = extractSvgFromTsx(text)
      if (!svg)
        return { ok: false, kind: 'tsx', icon: '', warnings, message: 'TSX içinde <svg> bloğu bulunamadı.' }
      const clean = sanitizeSvg(svg)
      if (!clean)
        return { ok: false, kind: 'tsx', icon: '', warnings, message: 'TSX içindeki SVG temizlenemedi.' }
      return { ok: true, kind: 'tsx', icon: clean, warnings }
    }

    case 'shadcn': {
      const { icon, message } = await fetchShadcnIcon(text)
      if (!icon)
        return { ok: false, kind: 'shadcn', icon: '', warnings, message }
      return { ok: true, kind: 'shadcn', icon, warnings }
    }

    case 'url': {
      // `data:` zaten gömülü — dokunma.
      if (text.startsWith('data:'))
        return { ok: true, kind: 'url', icon: text, warnings }
      const downloaded = await fetchIconUrl(text, warnings)
      return { ok: true, kind: 'url', icon: downloaded ?? text, warnings }
    }

    case 'path': {
      if (!LOCAL_PATH_RE.test(text))
        return { ok: false, kind: 'path', icon: '', warnings, message: 'Yerel yol /uploads/… biçiminde ve görsel uzantılı olmalı.' }
      return { ok: true, kind: 'path', icon: text, warnings }
    }

    case 'iconify': {
      if (!ICONIFY_RE.test(text))
        return { ok: false, kind: 'iconify', icon: '', warnings, message: 'Iconify adı "koleksiyon:ikon" biçiminde olmalı.' }
      return { ok: true, kind: 'iconify', icon: text, warnings }
    }

    default:
      return {
        ok: false,
        kind: null,
        icon: '',
        warnings,
        message: 'Tip algılanamadı. Gelişmiş bölümünden ikon tipini seç ya da SVG/TSX kodunu yapıştır.',
      }
  }
}
