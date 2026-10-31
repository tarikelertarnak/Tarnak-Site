import { z } from 'zod'

import { E164_MAX_DIGITS, normalizePhone } from '@/lib/phone'

/** E-posta için makul üst sınır. Telefon için E.164 (15 hane) geçerli. */
const CONTACT_VALUE_MAX = 254

/**
 * HONEYPOT (2026-10-07, form güvenliği).
 *
 * İnsan bu alanı göremez (`position:absolute; left:-9999px` + `aria-hidden`
 * + `tabIndex={-1}` + `autoComplete="off"`). Botlar formu doldururken görünmez
 * alanları da doldurur; dolu gelirse istek sessizce 200 "başarılı" ile
 * kapatılır — kullanıcıya hata da görmez, bot da geri bildirim almaz.
 *
 * Sunucu tarafı `contactFormSchema` içinde zorunlu: istemci alanı hiç
 * göndermezse bile boş string kabul edilir, dolu gelirse doğrulama patlar.
 */
export const HONEYPOT_FIELD = 'companyWebsite'

export const contactFormSchema = z
  .object({
    /** Bot tuzağı. Gerçek kullanıcı daima boş bırakır. */
    [HONEYPOT_FIELD]: z.string().max(200).optional().default(''),
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must not exceed 50 characters')
      .regex(/^[a-z\s]+$/i, 'Name can only contain letters and spaces'),
    contactMethod: z.enum(['email', 'phone']),
    contactValue: z
      .string()
      .min(3, 'Please enter your email or phone number')
      .max(
        CONTACT_VALUE_MAX,
        `Value must not exceed ${CONTACT_VALUE_MAX} characters`,
      ),
    message: z
      .string()
      .min(10, 'Message must be at least 10 characters')
      .max(1000, 'Message must not exceed 1000 characters'),
  })
  .refine(
    data =>
      data.contactMethod !== 'email'
      || z.string().email().safeParse(data.contactValue).success,
    { message: 'Please enter a valid email address', path: ['contactValue'] },
  )
  .refine(
    data =>
      data.contactMethod !== 'phone'
      || /^[+\d][\d\s().-]{5,}$/.test(data.contactValue.trim()),
    { message: 'Please enter a valid phone number', path: ['contactValue'] },
  )
  // ITU-T E.164: uluslararasi numara en fazla 15 hane ("+" hariç).
  .refine(
    (data) => {
      if (data.contactMethod !== 'phone') {
        return true
      }
      return normalizePhone(data.contactValue).ok
    },
    {
      message: `Phone number must be at most ${E164_MAX_DIGITS} digits`,
      path: ['contactValue'],
    },
  )

export interface ContactFormData {
  name: string
  contactMethod: 'email' | 'phone'
  contactValue: string
  message: string
}

export const contactApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
})

export type ContactApiResponse = z.infer<typeof contactApiResponseSchema>

// ── Admin content validation schema ─────────────────────────────
// All content coming from the admin panel passes through this schema.
// defaultTheme can only be 'light' | 'dark' | 'system' (inline script XSS protection).
const textField = z.string().max(500)

const itemList = z.array(
  z.object({
    label: z.string().max(100),
    icon: z.string().max(200).optional(),
    type: z.enum(['link', 'command']).optional(),
    href: z.string().max(1000).optional(),
  }),
)

const navItem = z.object({
  title: z.string().max(100),
  href: z.string().max(500),
})

const socialItem = z.object({
  name: z.string().max(100),
  href: z.string().max(500),
  icon: z.string().max(200),
  /*
    label/value (2026-10-20): şemada YOKTU → admin panelden içerik
    kaydedildiğinde `contentSchema` bunları SESSİZCE SİLİYORDU (zod4
    `z.object` bilinmeyen anahtarı düşürür; AGENTS.md §12 aynı tuzak).
    `content.ts` → `SocialItem.label?/value?` alanlarını TANIMLIYOR ve
    `contact-channels.ts:158-160` bunları override olarak kullanıyor
    (ör. Discord `label: 'Discord'`, `value: 'tarikeler'`). Şema eksik
    olduğu için o override hiçbir kayıtta kalıcı olamıyordu.
  */
  label: z.string().max(100).optional(),
  value: z.string().max(200).optional(),
})

const projectItem = z.object({
  title: z.string().max(200),
  notice: z.string().max(100).optional(),
  description: z.string().max(2000),
  projectLink: z.string().max(500),
  srcLink: z.string().max(500).optional(),
  image: z.string().max(500),
  /** Multiple media (image/gif/video URLs). Falls back to `image` when empty. */
  media: z.array(z.string().max(500)).max(12).optional(),
  stars: z.number().int().nonnegative().optional(),
  /** Öne çıkan proje, listenin en üstünde sabitlenir */
  pinned: z.boolean().optional(),
  /** Vaka çalışması alanları (boş bırakılabilir, uydurulmaz) */
  caseStudy: z
    .object({
      summary: z.string().max(2000).optional(),
      problem: z.string().max(4000).optional(),
      solution: z.string().max(4000).optional(),
      outcome: z.string().max(2000).optional(),
    })
    .optional(),
  forks: z.number().int().nonnegative().optional(),
  watchers: z.number().int().nonnegative().optional(),
  updatedAt: z.string().max(30).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  downloadMode: z.enum(['global', 'per-os']).optional(),
  downloadUrl: z.string().max(500).optional(),
  downloads: z
    .object({
      windows: z.string().max(500).optional(),
      android: z.string().max(500).optional(),
      linux: z.string().max(500).optional(),
    })
    .optional(),
})

const cvEntry = z.object({
  role: z.string().max(200),
  company: z.string().max(200),
  period: z.string().max(100),
  description: z.string().max(2000),
})

const interestItem = z.object({
  label: z.string().max(100),
  icon: z.string().max(200),
  content: z.string().max(1000),
})

/**
 * Hero çok dilli alan şeması (2026-10-20).
 *
 * ZOD 4 TUZAĞI: `z.object` bilinmeyen anahtarı SESSİZCE SİLER. Bu blok
 * şemaya yazılmazsa admin'in girdiği tüm diller her kaydetmede kaybolurdu
 * (AGENTS.md §12'de phase6 için birebir yaşandı). Negatif kontrollü test:
 * `validations.test.ts`.
 */
const heroI18n = z
  .object({
    tagline: z.record(z.string().max(50), z.string().max(500)).optional(),
    exploreLabel: z.record(z.string().max(50), z.string().max(500)).optional(),
    connectLabel: z.record(z.string().max(50), z.string().max(500)).optional(),
  })
  .optional()

export const contentSchema = z.object({
  hero: z.object({
    name: textField,
    tagline: textField,
    badge: textField,
    description: z.string().max(2000),
    exploreLabel: textField,
    connectLabel: textField,
    emoji: z.string().max(20),
    logo: z.string().max(1000).optional(),
    i18n: heroI18n,
    stats: z.array(z.object({ label: textField, value: textField })),
  }),
  nav: z.object({
    ctaLabel: textField,
    githubRepo: z.string().max(500),
    items: z.array(navItem).max(20),
  }),
  social: z.array(socialItem).max(20),
  about: z.object({
    subtitle: textField,
    title: textField,
    description: z.string().max(2000),
    whoTitle: textField,
    whoText: z.string().max(5000),
    toolboxTitle: textField,
    toolboxDescription: z.string().max(2000),
    toolbox: itemList,
    beyondTitle: textField,
    beyondDescription: z.string().max(2000),
    interests: z.array(interestItem).max(20),
    securityTitle: textField,
    securityText: z.string().max(2000),
    securityTools: itemList,
    teamTitle: textField.optional(),
    team: z
      .array(
        z.object({
          name: textField,
          role: textField,
        }),
      )
      .max(30)
      .optional(),
    cv: z
      .object({
        // ⚠️ `href` OLMALIYDI. Admin panelinde CV baglantisi DUZENLENEBILIR
        // (admin-panel.tsx "CV Linki" alani), ama semada olmadigi icin Zod
        // bu alani PARSE SIRASINDA SESSIZCE SILIYORDU → kaydetmede
        // `/cv/tarikeler-cv.pdf` varsayilanina geri donuyordu. Yani
        // kullanici CV linkini degistirip kaydediyor, degisiklik KALMIYORDU.
        href: z.string().max(500).optional(),
        summary: z.string().max(5000),
        experience: z.array(cvEntry).max(20),
        education: z.array(cvEntry).max(20),
      })
      .optional(),
  }),
  projects: z.object({
    subtitle: textField,
    title: textField,
    description: z.string().max(2000),
    items: z.array(projectItem).max(100),
  }),
  github: z.object({
    subtitle: textField,
    title: textField,
    description: z.string().max(2000),
  }),
  chat: z.object({
    subtitle: textField,
    title: textField,
    description: z.string().max(2000),
  }),
  profile: z.object({
    firstName: textField,
    lastName: textField,
    displayName: textField,
    nickname: textField,
    title: textField,
    profileImage: z.string().max(500),
    /** Kırpma öncesi orijinal görsel — yeni alan, eski kayıtlarda yok. */
    originalImage: z.string().max(500).optional(),
    experience: z.string().max(100).optional(),
    firstLanguage: z.string().max(100).optional(),
    otherLanguages: z.string().max(200).optional(),
  }),
  contact: z.object({
    subtitle: textField,
    title: textField,
    description: z.string().max(2000),
    footerText: z.string().max(2000),
    successTitle: textField,
    successText: z.string().max(2000),
    email: z.string().max(200).optional(),
    phone: z.string().max(200).optional(),
    location: z.string().max(500).optional(),
    locationYandex: z.string().max(500).optional(),
  }),
  settings: z.object({
    githubUsername: z.string().max(100),
    defaultTheme: z.enum(['light', 'dark', 'system']),
    backgroundImage: z.string().max(500),
    /** Hangi temada arka plan gösterilecek: 'all' | 'dark' | 'light' */
    backgroundTheme: z.enum(['all', 'dark', 'light']).optional(),
    /** Hangi sayfalarda arka plan gösterilecek (path listesi) */
    backgroundPages: z.array(z.string()).optional(),
  }),
  footer: z.object({
    copyright: textField,
  }),
  /**
   * Ek bölümler + `/about` içeriği.
   *
   * ⚠️ Bunlar `contentSchema`'da TANIMLI DEĞİLSE Zod onları PARSE SIRASINDA
   * SESSİZCE SİLER ve kaydetme bu alanları yok eder (sessiz veri kaybı).
   * `z.unknown()` ile şemadan geçirilir; ayrıntılı doğrulama kendi
   * modüllerinde (`phase6Schema`, `aboutPageSchema`) yapılır.
   */
  phase6: z.unknown().optional(),
  aboutPage: z.unknown().optional(),
  /*
   * 2026-10-30 (Boss): çok dilli metin + görsel düzenleme + aktif dil listesi.
   * TANIMLI DEĞİLSE Zod SESSİZCE SİLER (yukarıdaki uyarının aynısı).
   * Değer sınırları burada: dil kodu 12, alan anahtarı 120, metin 20.000
   * karakter; düzenleme kayıtları API katmanında `designOverrideSchema` ile
   * ayrıca doğrulanır.
   */
  textOverrides: z
    .record(
      z.string().min(2).max(12),
      z.record(z.string().min(1).max(120), z.string().max(20_000)),
    )
    .optional(),
  design: z.array(z.unknown()).max(500).optional(),
  locales: z.array(z.string().min(2).max(12)).max(60).optional(),
})

export type ContentInput = z.infer<typeof contentSchema>
