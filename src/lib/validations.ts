import { z } from 'zod'

const CONTACT_VALUE_MAX = 100

export const contactFormSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must not exceed 50 characters')
      .regex(/^[a-z\s]+$/i, 'Name can only contain letters and spaces'),
    contactMethod: z.enum(['email', 'phone']),
    contactValue: z
      .string()
      .min(3, 'Please enter your email or phone number')
      .max(CONTACT_VALUE_MAX, `Value must not exceed ${CONTACT_VALUE_MAX} characters`),
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

export const contentSchema = z.object({
  hero: z.object({
    name: textField,
    tagline: textField,
    badge: textField,
    description: z.string().max(2000),
    exploreLabel: textField,
    connectLabel: textField,
    emoji: z.string().max(20),
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
  }),
  footer: z.object({
    copyright: textField,
  }),
})

export type ContentInput = z.infer<typeof contentSchema>
