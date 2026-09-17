import arcjet, { protectSignup } from '@arcjet/next'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import env from '@/lib/env'
import { contactFormSchema } from '@/lib/validations'

const supabaseAdmin
  = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE)
    : null

const aj = env.ARCJET_KEY
  ? arcjet({
      key: env.ARCJET_KEY,
      rules: [
        protectSignup({
          email: {
            mode: 'LIVE',
            // Arcjet 1.13'te `block` -> `deny` olarak yeniden adlandirildi.
            // (1.0.0-beta.11'de `block` idi; build bunu TS2353 ile yakaladi.)
            deny: ['DISPOSABLE', 'NO_MX_RECORDS', 'INVALID'],
          },
          bots: {
            mode: 'LIVE',
            allow: ['CATEGORY:MONITOR'],
          },
          rateLimit: {
            mode: 'LIVE',
            interval: '10m',
            max: 3,
          },
        }),
      ],
    })
  : null

async function sendToDiscord(name: string, email: string, phone: string, message: string) {
  if (!env.DISCORD_WEBHOOK_URL) {
    console.warn('⚠️ DISCORD_WEBHOOK_URL not set, message could not be sent to the webhook.')
    return true
  }

  try {
    const webhookPayload = {
      embeds: [
        {
          title: 'New Contact Message',
          color: 0x3B82F6,
          fields: [
            { name: 'Name', value: name, inline: true },
            { name: 'Email', value: email || '(belirtilmedi)', inline: true },
            { name: 'Phone', value: phone || '(belirtilmedi)', inline: true },
            { name: 'Message', value: message },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }
    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    })
    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`)
    }
    return true
  }
  catch (error) {
    console.error('Failed to send message to Discord:', error)
    return false
  }
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  }
  catch {
    return NextResponse.json({ success: false, message: 'Missing Body' }, { status: 400 })
  }

  const values = contactFormSchema.safeParse(body)
  if (!values.success) {
    return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 })
  }

  const contactEmail
    = values.data.contactMethod === 'email' ? values.data.contactValue.trim() : ''
  const contactPhone
    = values.data.contactMethod === 'phone' ? values.data.contactValue.trim() : ''

  if (aj) {
    try {
      const decision = await aj.protect(req, {
        email: contactEmail,
      })

      if (decision.isDenied()) {
        if (decision.reason.isEmail()) {
          return NextResponse.json(
            { success: false, message: 'Invalid email address. Please check and try again.' },
            { status: 400 },
          )
        }
        else if (decision.reason.isRateLimit()) {
          return NextResponse.json(
            { success: false, message: 'Too many requests. Please wait a few minutes before trying again.' },
            { status: 429 },
          )
        }
        else if (decision.reason.isBot()) {
          return NextResponse.json(
            { success: false, message: 'Automated requests are not allowed. Please try again.' },
            { status: 403 },
          )
        }
        else {
          return NextResponse.json(
            { success: false, message: 'Request forbidden. Please try again later.' },
            { status: 403 },
          )
        }
      }

      if (decision.ip.hasAsn() && decision.ip.asnType === 'hosting') {
        return NextResponse.json(
          { success: false, message: 'Requests from hosting providers are not allowed.' },
          { status: 403 },
        )
      }

      if (
        decision.ip.isHosting()
        || decision.ip.isVpn()
        || decision.ip.isProxy()
        || decision.ip.isRelay()
      ) {
        return NextResponse.json(
          { success: false, message: 'Requests from VPNs, proxies, or suspicious networks are not allowed.' },
          { status: 403 },
        )
      }
    }
    catch (err) {
      // Arcjet bir AG servisi. Ulasilamazsa / transport hatasi verirse istegi
      // DUSURMEYIZ. Eskiden bu cagri try/catch DISINDAYDI: tek bir hata tum
      // POST'u 500 yapiyor ve iletisim formu tamamen kiriliyordu.
      // Burada bilincli olarak fail-open secildi — guvenlik kuralindan once
      // erisilebilirlik. Supheli istekler yine Discord'a dusup elle gorulur.
      console.warn('[api/contact] Arcjet kontrolu atlandi (fail-open):', err)
    }
  }

  const sent = await sendToDiscord(
    values.data.name,
    contactEmail,
    contactPhone,
    values.data.message,
  )

  // Also save to the Supabase messages table (if present; RLS allows public insert)
  if (supabaseAdmin) {
    const { error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        name: values.data.name,
        email: contactEmail,
        phone: contactPhone,
        subject: 'İletişim Formu',
        body: values.data.message,
      })

    if (insertError) {
      console.error('Supabase message insert failed:', insertError.message)
    }
  }

  if (!sent) {
    return NextResponse.json(
      { success: false, message: 'Failed to send message. Please try again later.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, message: 'Message sent successfully!' }, { status: 200 })
}
