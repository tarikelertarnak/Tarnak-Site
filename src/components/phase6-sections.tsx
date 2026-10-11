import type {
  Availability,
  Certificate,
  Service,
  Testimonial,
  TimelineItem,
} from '@/lib/phase6'
import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'

/**
 * Faz 6 — yeni bölüm bileşenleri
 *
 * ORTAK KURAL: içerik uydurulmaz. Her bileşen boş veriyle çağrılırsa
 * `null` döner → sayfada boş kart yığını oluşmaz.
 *
 * Tasarım dili: mevcut kart sistemi, mavi vurgu, yuvarlak köşe,
 * 24px bölüm boşluğu (`--section-gap`), glow YOK.
 */

/* ── Müsaitlik rozeti ─────────────────────────────────────────────────── */

const TONE_RENK: Record<Availability['tone'], string> = {
  available: 'bg-emerald-500',
  busy: 'bg-amber-500',
  offline: 'bg-foreground/40',
}

export function AvailabilityBadge({ data }: { data?: Availability }) {
  if (!data?.enabled || !data.label) return null

  return (
    <Link
      href={data.href || '/contact/'}
      className="group inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/60 px-3 py-1.5 text-sm transition-colors duration-200 hover:border-primary/60"
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${TONE_RENK[data.tone]} opacity-60`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${TONE_RENK[data.tone]}`}
        />
      </span>
      <span className="text-foreground/80 group-hover:text-foreground">
        {data.label}
      </span>
      <span
        aria-hidden
        className="text-foreground/30 transition-transform duration-200 group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  )
}

/* ── Hizmetler ────────────────────────────────────────────────────────── */

export function ServicesSection({
  title,
  description,
  items,
  ctaLabel,
  ctaHref,
}: {
  title?: string
  description?: string
  items: Service[]
  ctaLabel: string
  ctaHref: string
}) {
  const azalt = useReducedMotion()
  if (items.length === 0) return null

  return (
    <section
      aria-labelledby="hizmetler-baslik"
      className="mx-auto w-full max-w-6xl px-4 sm:px-6"
    >
      <header className="mx-auto max-w-3xl text-center">
        <h2
          id="hizmetler-baslik"
          className="text-2xl font-black tracking-tight sm:text-3xl"
        >
          {title || 'Hizmetler'}
        </h2>
        {description && (
          <p className="mt-3 text-sm text-foreground/60 sm:text-base">
            {description}
          </p>
        )}
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((hizmet, i) => (
          <motion.article
            key={`${hizmet.title}-${i}`}
            initial={azalt ? false : { opacity: 0, y: 24 }}
            whileInView={azalt ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: azalt ? 0 : i * 0.07 }}
            className="flex flex-col rounded-xl border border-foreground/10 p-5 transition-colors duration-200 hover:border-primary/50"
          >
            {hizmet.tag && (
              <span className="mb-2 w-fit rounded-full border border-primary/50 px-2.5 py-0.5 text-xs font-medium text-primary">
                {hizmet.tag}
              </span>
            )}
            {hizmet.title && (
              <h3 className="text-base font-bold">{hizmet.title}</h3>
            )}
            {hizmet.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">
                {hizmet.description}
              </p>
            )}
            {hizmet.tech.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {hizmet.tech.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-foreground/10 px-2 py-0.5 text-[11px] text-foreground/60"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </motion.article>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href={ctaHref}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {ctaLabel}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  )
}

/* ── Referanslar ─────────────────────────────────────────────────────── */

export function TestimonialsSection({
  title,
  items,
}: {
  title?: string
  items: Testimonial[]
}) {
  // Yalnızca metni dolu kartları göster — isim/rol boşsa kart işe yaramaz.
  const dolu = items.filter((i) => i.quote)
  if (dolu.length === 0) return null

  return (
    <section
      aria-labelledby="referanslar-baslik"
      className="mx-auto w-full max-w-6xl px-4 sm:px-6"
    >
      <header className="mx-auto max-w-3xl text-center">
        <h2
          id="referanslar-baslik"
          className="text-2xl font-black tracking-tight sm:text-3xl"
        >
          {title || 'Referanslar'}
        </h2>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dolu.map((r, i) => (
          <figure
            key={`${r.name ?? 'ref'}-${i}`}
            className="flex flex-col rounded-xl border border-foreground/10 p-5"
          >
            <blockquote className="text-sm leading-relaxed text-foreground/75">
              {r.quote}
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary"
              >
                {(r.name ?? '?').trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                {r.name && (
                  <span className="block truncate text-sm font-medium">
                    {r.name}
                  </span>
                )}
                {r.role && (
                  <span className="block truncate text-xs text-foreground/50">
                    {r.role}
                  </span>
                )}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

/* ── Zaman çizelgesi ─────────────────────────────────────────────────── */

const KIND_ETIKET: Record<TimelineItem['kind'], string> = {
  education: 'Eğitim',
  work: 'Deneyim',
  learning: 'Öğrenme',
  project: 'Proje',
}

export function TimelineSection({
  title,
  items,
}: {
  title?: string
  items: TimelineItem[]
}) {
  const dolu = items.filter((i) => i.title)
  if (dolu.length === 0) return null

  return (
    <section
      aria-labelledby="zaman-baslik"
      className="mx-auto w-full max-w-3xl px-4 sm:px-6"
    >
      <h2
        id="zaman-baslik"
        className="text-xl font-black tracking-tight sm:text-2xl"
      >
        {title || 'Yolculuk'}
      </h2>

      <ol className="mt-6 space-y-0">
        {dolu.map((item, i) => (
          <li
            key={`${item.year ?? ''}-${item.title ?? i}`}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {/* Dikey çizgi */}
            {i < dolu.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[7px] top-4 h-full w-px bg-foreground/12"
              />
            )}
            <span
              aria-hidden
              className="relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-primary bg-background"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {item.year && (
                  <span className="text-xs font-semibold tabular-nums text-primary">
                    {item.year}
                  </span>
                )}
                <span className="rounded-full border border-foreground/12 px-2 py-0.5 text-[10px] text-foreground/55">
                  {KIND_ETIKET[item.kind]}
                </span>
              </div>
              <h3 className="mt-1 text-sm font-semibold sm:text-base">
                {item.title}
              </h3>
              {item.description && (
                <p className="mt-1 text-sm leading-relaxed text-foreground/65">
                  {item.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ── Sertifikalar ────────────────────────────────────────────────────── */

export function CertificatesSection({
  title,
  items,
}: {
  title?: string
  items: Certificate[]
}) {
  const dolu = items.filter((i) => i.name)
  if (dolu.length === 0) return null

  return (
    <section
      aria-labelledby="sertifika-baslik"
      className="mx-auto w-full max-w-3xl px-4 sm:px-6"
    >
      <h2
        id="sertifika-baslik"
        className="text-xl font-black tracking-tight sm:text-2xl"
      >
        {title || 'Sertifikalar & Başarılar'}
      </h2>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {dolu.map((c, i) => {
          const govde = (
            <>
              <p className="text-sm font-medium">{c.name}</p>
              <p className="mt-0.5 text-xs text-foreground/55">
                {[c.issuer, c.year].filter(Boolean).join(' · ')}
              </p>
            </>
          )
          return (
            <li key={`${c.name}-${i}`}>
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-foreground/10 p-4 transition-colors hover:border-primary/50"
                >
                  {govde}
                </a>
              ) : (
                <div className="rounded-xl border border-foreground/10 p-4">
                  {govde}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
