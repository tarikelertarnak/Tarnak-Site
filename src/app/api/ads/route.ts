import { NextResponse } from 'next/server'

import { clientIp } from '@/lib/client-ip'
import {
  getAdPick,
  getSlots,
  getStats,
  issueViewToken,
  recordView,
  requiredWatchSeconds,
  verifyViewToken,
  viewTokenState,
  type AdPlacement,
} from '@/lib/ads'

/**
 * GET  /api/ads?placement=ads-page  -> izlenecek reklam + imzali token + istatistik
 * POST /api/ads  { token, watchedSeconds } -> sure dolduysa izlenmeyi kaydeder
 *
 * Neden GET token uretiyor: sureyi sunucu olcmeli. Istemci "15 saniye izledim"
 * derse buna guvenilmez; sunucu token'i verdigi ani bilir ve tamamlama aninda
 * aradan gercekten gectigini kontrol eder. Boylece `curl` ile saniyeler icinde
 * yuzlerce sahte izlenme yazilamaz.
 */

const PLACEMENTS: AdPlacement[] = ['ads-page', 'donate', 'banner']

function parsePlacement(value: string | null): AdPlacement {
  return PLACEMENTS.includes(value as AdPlacement) ? (value as AdPlacement) : 'ads-page'
}

/**
 * Istemci IP'si — paylasilan `lib/client-ip` kullanilir.
 * (Bu mantik eskiden 4 dosyada kopyalanmisti ve ikisi yanlisti; bkz. o dosya.)
 */

// Basit bellek-ici hiz siniri (GET spam'ini engeller)
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 40
const MAX_TRACKED_IPS = 3000
const hits = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  if (hits.size > MAX_TRACKED_IPS) {
    for (const [key, times] of hits) {
      if (times.every(t => now - t > WINDOW_MS))
        hits.delete(key)
    }
  }
  const recent = (hits.get(ip) || []).filter(t => now - t <= WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > MAX_PER_WINDOW
}

export async function GET(req: Request) {
  const ip = clientIp(req)
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests. Please slow down.' },
      { status: 429 },
    )
  }

  const params = new URL(req.url).searchParams
  const placement = parsePlacement(params.get('placement'))

  // all=1 -> yerlesimdeki TUM slotlari dondur (sayfadaki reklam izgarasi icin).
  // Tek istekte gelir; N ayrı istek atmaya gerek kalmaz.
  if (params.get('all') === '1') {
    const { slots, source } = await getSlots(placement)
    return NextResponse.json({ ok: true, slots, source })
  }

  // slot=<slug> -> belirli bir reklami sec (destek bolumundeki "sureli reklam"
  // ve "linkli reklam" butonlari hangi birimi oynatacagini boyle belirler).
  const wanted = params.get('slot')
  if (wanted) {
    const { slots, source } = await getSlots(placement)
    const found = slots.find(s => s.id === wanted)
    if (!found) {
      return NextResponse.json(
        { ok: false, message: 'Ad slot not found.', stats: await getStats() },
        { status: 404 },
      )
    }
    return NextResponse.json({
      ok: true,
      slot: found,
      token: issueViewToken(found.id, found.durationSeconds, found.kind),
      stats: await getStats(),
      source,
    })
  }

  const pick = await getAdPick(placement)

  if (!pick) {
    return NextResponse.json(
      { ok: false, message: 'No ad available for this placement.', stats: await getStats() },
      { status: 404 },
    )
  }

  return NextResponse.json({ ok: true, ...pick })
}

export async function POST(req: Request) {
  const ip = clientIp(req)
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests. Please slow down.' },
      { status: 429 },
    )
  }

  let body: { token?: unknown, watchedSeconds?: unknown }
  try {
    body = await req.json()
  }
  catch {
    return NextResponse.json({ ok: false, message: 'Missing body.' }, { status: 400 })
  }

  const payload = verifyViewToken(body.token)
  if (!payload) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', message: 'Invalid or tampered token.' },
      { status: 400 },
    )
  }

  // ⚠️ Asil kontrol: istemcinin beyanina degil, sunucunun olctugu sureye bakilir.
  const state = viewTokenState(payload)
  if (state !== 'ok') {
    return NextResponse.json(
      {
        ok: false,
        reason: state,
        message: state === 'expired'
          ? 'This ad session expired. A new ad has been prepared — please watch it.'
          : 'Ad was not watched long enough.',
        requiredSeconds: requiredWatchSeconds(payload),
      },
      { status: 400 },
    )
  }

  const declared = Number(body.watchedSeconds)
  const cap = requiredWatchSeconds(payload)
  const watchedSeconds = Number.isFinite(declared) && declared > 0
    ? Math.min(declared, cap)
    : cap

  const recorded = await recordView({
    slotId: payload.slotId,
    nonce: payload.nonce,
    completed: true,
    watchedSeconds,
    ip,
  })

  // Ayni token tekrar gonderildiyse sayim ARTMAZ (token_nonce UNIQUE).
  // Kullaniciya hata degil "zaten kaydedildi" bilgisi doneriz — tarayicida
  // geri/ileri gitmis ya da istegi tekrarlamis olabilir.
  return NextResponse.json({
    ok: true,
    completed: true,
    duplicate: recorded === 'duplicate',
    stats: await getStats(),
  })
}
