import { z } from 'zod'

/**
 * Faz 6 — yeni bölümlerin içerik şeması.
 *
 * ORTAK KURAL (ortak kural dosyasından): içerik UYDURULMAZ. Bu şemadaki
 * her alanın boş bırakılabilir bir hâli var; boş olan bölüm sayfada
 * **render edilmez**, "TODO" placeholder'ı gösterilir ya da gizlenir.
 * Böylece kullanıcı gerçek bilgileri girene kadar site boş kart
 * yığını göstermez.
 *
 * Doğrulama katmanı zod: eksik/bozuk içerik build'i düşürmez, alan
 * düzeltilir veya alan boş sayılır.
 */

/* ── Müsaitlik rozeti (ana sayfa hero) ─────────────────────────────────── */
export const availabilitySchema = z.object({
  /** Rozet görünür mü? */
  enabled: z.boolean().default(false),
  /** Kısa etiket, örn. "Projeler için müsaitim" */
  label: z.string().max(60).optional(),
  /** Renk tonu — buton stiliyle aynı aile */
  tone: z.enum(['available', 'busy', 'offline']).default('available'),
  /** Tıklanınca gidilecek sayfa (boşsa iletişim) */
  href: z.string().max(200).optional(),
})

/* ── Hizmetler bölümü ────────────────────────────────────────────────── */
export const serviceSchema = z.object({
  title: z.string().max(80).optional(),
  /** Ne yaptığın — tek paragraf */
  description: z.string().max(600).optional(),
  /** Hangi teknolojiler */
  tech: z.array(z.string().max(40)).max(8).default([]),
  /** Kart köşesindeki kısa etiket (ikon adı değil) */
  tag: z.string().max(30).optional(),
  order: z.number().int().min(0).max(999).default(100),
})

/* ── Referanslar ( testimonial ) ─────────────────────────────────────── */
export const testimonialSchema = z.object({
  name: z.string().max(80).optional(),
  role: z.string().max(80).optional(),
  quote: z.string().max(600).optional(),
  /** Avatar yolu — boşsa baş harf rozeti basılır */
  avatar: z.string().max(300).optional(),
})

/* ── Zaman çizelgesi (Hakkımda) ──────────────────────────────────────── */
export const timelineSchema = z.object({
  year: z.string().max(20).optional(),
  title: z.string().max(100).optional(),
  description: z.string().max(600).optional(),
  /** Kategori — renk/ikon seçimi */
  kind: z
    .enum(['education', 'work', 'learning', 'project'])
    .default('learning'),
  order: z.number().int().min(0).max(999).default(100),
})

/* ── Sertifikalar / başarılar kartı ─────────────────────────────────── */
export const certificateSchema = z.object({
  name: z.string().max(120).optional(),
  issuer: z.string().max(120).optional(),
  /** Kazanım yılı */
  year: z.string().max(10).optional(),
  /** Doğrulama bağlantısı (isteğe bağlı) */
  url: z.string().max(400).optional(),
})

/* ── /uses — kullandığım donanım/yazılım ────────────────────────────── */
export const usesGroupSchema = z.object({
  title: z.string().min(1).max(60),
  description: z.string().max(240).optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        /** Ne işe yaradığı — kısa not */
        note: z.string().max(160).optional(),
        /** Satın alma bağlantısı (varsa) */
        href: z.string().max(400).optional(),
      }),
    )
    .default([]),
  order: z.number().int().min(0).max(999).default(100),
})

/* ── /now ────────────────────────────────────────────────────────────── */
export const nowSchema = z.object({
  updated: z.string().max(40).optional(),
  learning: z.array(z.string().max(160)).max(6).default([]),
  building: z.array(z.string().max(160)).max(6).default([]),
  reading: z.array(z.string().max(160)).max(6).default([]),
  listening: z.array(z.string().max(160)).max(6).default([]),
})

/* ── /changelog ──────────────────────────────────────────────────────── */
export const changelogEntrySchema = z.object({
  date: z.string().max(40).optional(),
  title: z.string().max(120).optional(),
  /** Madde işaretli değişiklik listesi */
  changes: z.array(z.string().max(300)).max(20).default([]),
})

/* ── Bülten aboneliği (Faz 6 · 4) ───────────────────────────────────── */
export const newsletterSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().max(80).optional(),
  description: z.string().max(300).optional(),
  /**
   * Sağlayıcı anahtarı — BOŞ. Kullanıcı seçip dolduracak.
   * TODO (kullanıcı): butchery/brevo/mailchimp vb. seç, `NEXT_PUBLIC_NEWSLETTER_*`
   * ortam değişkenlerini doldur. Boşken form "yakında" durumunda kalır.
   */
  provider: z.string().max(40).optional(),
})

/* ── YouTube / videolar ─────────────────────────────────────────────── */
export const videosSchema = z.object({
  /**
   * YouTube kanal ID'si (UCxxxx). BOŞ — kullanıcı dolduracak.
   *  Boşken bölüm HİÇ render edilmez (kullanıcı isteği: "hata olursa
   *  bölüm gizlensin").
   */
  channelId: z.string().max(40).optional(),
  title: z.string().max(80).optional(),
  maxItems: z.number().int().min(1).max(12).default(4),
})

/* ── Dijital kartvizit ──────────────────────────────────────────────── */
export const vcardSchema = z.object({
  enabled: z.boolean().default(true),
  /** vCard içindeki not */
  note: z.string().max(200).optional(),
  /** QR kodunda gösterilecek adres (boşsa site adresi) */
  qrTarget: z.string().max(300).optional(),
})

/* ── Hukuki sayfalar ─────────────────────────────────────────────────── */
export const legalPageSchema = z.object({
  title: z.string().max(100).optional(),
  updated: z.string().max(40).optional(),
  /** Gövde — düz metin (paragraflar boş satırla ayrılır) */
  body: z.string().max(20000).optional(),
  /** "Hukuki inceleme gerekli" uyarısı gösterilsin mi (kullanıcı şartı) */
  needsLegalReview: z.boolean().default(true),
})

/* ── Ana bölüm: hepsi tek yerde ─────────────────────────────────────── */
export const phase6Schema = z.object({
  availability: availabilitySchema.optional(),
  services: z
    .object({
      title: z.string().max(80).optional(),
      description: z.string().max(300).optional(),
      items: z.array(serviceSchema).default([]),
    })
    .optional(),
  testimonials: z
    .object({
      title: z.string().max(80).optional(),
      items: z.array(testimonialSchema).default([]),
    })
    .optional(),
  timeline: z
    .object({
      title: z.string().max(80).optional(),
      items: z.array(timelineSchema).default([]),
    })
    .optional(),
  certificates: z
    .object({
      title: z.string().max(80).optional(),
      items: z.array(certificateSchema).default([]),
    })
    .optional(),
  uses: z
    .object({
      title: z.string().max(80).optional(),
      description: z.string().max(300).optional(),
      groups: z.array(usesGroupSchema).default([]),
    })
    .optional(),
  now: nowSchema.optional(),
  changelog: z
    .object({
      title: z.string().max(80).optional(),
      entries: z.array(changelogEntrySchema).default([]),
    })
    .optional(),
  newsletter: newsletterSchema.optional(),
  videos: videosSchema.optional(),
  vcard: vcardSchema.optional(),
  privacy: legalPageSchema.optional(),
  kvkk: legalPageSchema.optional(),
})

export type Availability = z.infer<typeof availabilitySchema>
export type Service = z.infer<typeof serviceSchema>
export type Testimonial = z.infer<typeof testimonialSchema>
export type TimelineItem = z.infer<typeof timelineSchema>
export type Certificate = z.infer<typeof certificateSchema>
export type UsesGroup = z.infer<typeof usesGroupSchema>
export type Now = z.infer<typeof nowSchema>
export type ChangelogEntry = z.infer<typeof changelogEntrySchema>
export type Newsletter = z.infer<typeof newsletterSchema>
export type Videos = z.infer<typeof videosSchema>
export type VCard = z.infer<typeof vcardSchema>
export type LegalPage = z.infer<typeof legalPageSchema>
export type Phase6 = z.infer<typeof phase6Schema>

/**
 * Güvenli ayrıştırma — bozuk veri build'i düşürmez.
 * `undefined` dönerse çağıran kendi boş durumunu gösterir.
 */
export function parsePhase6(input: unknown): Phase6 | null {
  if (input === undefined || input === null) return null
  const sonuc = phase6Schema.safeParse(input)
  if (!sonuc.success) {
    console.warn(
      '[phase6] şema doğrulaması başarısız:',
      sonuc.error.issues
        .slice(0, 3)
        .map((i) => i.message)
        .join(' | '),
    )
    return null
  }
  const d = sonuc.data
  // Grupları sırala (order küçük = üstte)
  if (d.services) d.services.items.sort((a, b) => a.order - b.order)
  if (d.timeline) d.timeline.items.sort((a, b) => a.order - b.order)
  if (d.uses) d.uses.groups.sort((a, b) => a.order - b.order)
  return d
}
