import { NextResponse } from 'next/server'

/**
 * Sağlık ucu — UptimeRobot / Cloudflare durum izleme için.
 *
 * TASARIM KARARI (Faz 1 · operasyon):
 *  · **Her zaman erişilebilir.** Bakım modunda bile 200 döner; bakım
 *    sırasında "site çöktü" sanılmasın. Bakım durumu gövdede `maintenance`
 *    olarak bildirilir.
 *  · **Ucuz.** KV/Supabase/Disk yok — tek `Response`, sıfır ağ. Yoksa
 *    izleyici kendisi izlediği şeyi bozuyor.
 *  · **Sır sızdırmaz.** Sadece zaman damgası + durum. Build kimliği,
 *    commit, env değeri YOK.
 *
 * Cache: `no-store` — yoksa izleyici önbellekten okur ve gerçek durumu
 * göremez.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      time: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  )
}