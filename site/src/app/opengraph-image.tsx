import { ImageResponse } from 'next/og'
import { SITE_URL } from '@/lib/site-url'

/**
 * Open Graph görseli)
 *
 * EDGE UYUMU: `next/og` (satori) Workers'ta çalışır; `fs`, `sharp` gibi
 * Node'e özgü bir şey kullanmılmıyor. Görsel tamamen JSX ile çiziliyor.
 *
 * TASARIM KURALLARI (kullanıcı şartı):
 *  · Sade, mavi vurgulu, **GLOW YOK**.
 *  · Buton stiliyle aynı mavi (`--tprimary` ailesi); tema yerine SABİT
 *    koyu zemin — paylaşım kartları her cihazda aynı görünsün diye.
 *  · Ölçüler 1200×630 (Open Graph standardı).
 */

export const alt = 'Tarık Eler (Tarnak) — Yazılımcı & Sistem Mimarisi'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/*
 * `force-static` ZORUNLU (2026-10-18 kök neden düzeltmesi).
 *
 * Bu route `dynamic` export ETMİYORDU → Next onu istek-zamanlı (dinamik) sayıp
 * worker bundle'ına dahil ediyordu. Dinamik OG, `next/og` içindeki
 * `getFallbackFont()`'u çağırıyor ve Next 16.4 bunu MUTLAK DOSYA YOLU ile
 * import ediyor:
 *   await import("/home/tarkeler/tarnak-build/.open-next/server-functions/.../Geist-Regular.ttf.bin")
 * workerd'de dosya sistemi ve mutlak path import YOK → import hiç çözülemiyor,
 * istek askıda kalıyor ve Workers "code had hung" deyip isteği iptal ediyor
 * (canlıda /admin ve /api/* için 1101 — ölçülerek doğrulandı).
 *
 * `force-static` ile görsel BUILD zamanında tek sefer üretiliyor; @vercel/og
 * ve font/wasm dosyaları worker bundle'a hiç girmiyor. Görsel zaten istek
 * başına değişmiyor (JSX + sabit renkler), dolayısıyla davranış aynı kalır.
 */
export const dynamic = 'force-static'

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '80px',
        background: '#0a0a0b',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Mavi vurgu çubuğu — glow değil, düz çizgi */}
      <div
        style={{
          display: 'flex',
          width: 96,
          height: 8,
          background: '#3b82f6',
          marginBottom: 40,
        }}
      />

      <div
        style={{
          display: 'flex',
          fontSize: 76,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: -2,
          lineHeight: 1.05,
        }}
      >
        TARIK ELER
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 76,
          fontWeight: 800,
          color: '#3b82f6',
          letterSpacing: -2,
          lineHeight: 1.05,
        }}
      >
        TARNAK
      </div>

      <div
        style={{
          display: 'flex',
          marginTop: 28,
          fontSize: 32,
          color: '#a1a1aa',
        }}
      >
        Yazılımcı &amp; Sistem Mimarisi
      </div>

      {/* Alt bilgi — site adı, ince ayraçla */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 'auto',
          fontSize: 24,
          color: '#71717a',
        }}
      >
        {SITE_URL.replace(/^https?:\/\//, '')}
      </div>
    </div>,
    { ...size },
  )
}
