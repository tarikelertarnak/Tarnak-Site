import type { Locale } from '@/lib/i18n'
import { z } from 'zod'

/**
 * `/about` sayfasının içerik şeması (2026-10-17).
 *
 * Neden yeni bir modül: `/about` sayfasındaki biyografi `src/app/about/page.tsx`
 * içinde TypeScript sabitlerine gömülüydü (`TIMELINE`, `FOCUS`, `VALUES`) —
 * içinde onaylanmamış tarihler, uydurma istatistikler ve eski yanlış iddialar
 * vardı. Artık içeriğin TEK kaynağı `site_content.content->'aboutPage'`
 * alanıdır; admin paneli "Profil & Hakkımda → Hakkımda Sayfası" bölümünden
 * düzenler, sayfa oradan okur.
 *
 * Kurallar:
 * · İçerik uydurulmaz — alanlar boş başlar, seed `supabase/about-page.sql`
 *   ile yalnızca veritabanı BOŞKEN yazılır (mevcut admin düzenlemeleri ezmez).
 * · Kaynak koda fallback YOKTUR: içerik yoksa sayfa yerelleştirilmiş boş
 *   durum, bozuksa hata durumu gösterir.
 * · Türkçe ve İngilizce metin AYNI kayıtta tutulur (`{ tr, en }`).
 */

/* ── İki dilli metin ──────────────────────────────────────────────────── */

export const bilingualSchema = z.object({
  tr: z.string().max(4000).default(''),
  en: z.string().max(4000).default(''),
})

export type Bilingual = z.infer<typeof bilingualSchema>

/**
 * Kararlı ve benzersiz madde anahtarı (önemli cümle değil, kimlik).
 * `web-development`, `early-beginnings` gibi kebab-case.
 */
export const aboutKeySchema = z
  .string()
  .min(1, 'Anahtar boş olamaz.')
  .max(60, 'Anahtar en fazla 60 karakter olabilir.')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Anahtar yalnızca küçük harf, rakam ve tire içerebilir (örn: web-development).',
  )

/* ── Liste maddeleri (çalışma alanları / yolculuk / değerler) ─────────── */

export const aboutItemSchema = z.object({
  key: aboutKeySchema,
  title: bilingualSchema,
  description: bilingualSchema,
  /**
   * Dönem/yıl — YALNIZCA yolculuk maddelerinde kullanılır ve OPSİYONELDİR.
   * Kullanıcı yıl girmek zorunda değildir; boş bırakılan yıl uydurulmaz ve
   * sayfada hiç gösterilmez.
   */
  period: z.string().max(40).default(''),
})

export type AboutItem = z.infer<typeof aboutItemSchema>

/* ── Sayfa ────────────────────────────────────────────────────────────── */

export const aboutPageSchema = z
  .object({
    /** Sayfa başlığı (hero) — örn. "HAKKIMDA" / "ABOUT ME". */
    title: bilingualSchema.default({ tr: '', en: '' }),
    /** Giriş metni — paragraflar boş satırla ayrılır. */
    intro: bilingualSchema.default({ tr: '', en: '' }),
    /** "Çalışma alanları" — sıralı. */
    areas: z.array(aboutItemSchema).max(50).default([]),
    /** "Yolculuk" — sıralı, `period` opsiyonel. */
    journey: z.array(aboutItemSchema).max(50).default([]),
    /** "Değerler" — sıralı. */
    values: z.array(aboutItemSchema).max(50).default([]),
    /** Kapanış metni — paragraflar boş satırla ayrılır. */
    closing: bilingualSchema.default({ tr: '', en: '' }),
  })
  .superRefine((page, ctx) => {
    const listeler: [('areas' | 'journey' | 'values'), string][] = [
      ['areas', 'areas'],
      ['journey', 'journey'],
      ['values', 'values'],
    ]
    for (const [alan, yol] of listeler) {
      const gorulen = new Set<string>()
      page[alan].forEach((item, i) => {
        if (gorulen.has(item.key)) {
          ctx.addIssue({
            code: 'custom',
            path: [yol, i, 'key'],
            message:
              'Bu anahtar aynı listede iki kez kullanılamaz — benzersiz olmalı.',
          })
        }
        gorulen.add(item.key)
      })
    }
  })

export type AboutPage = z.infer<typeof aboutPageSchema>

/**
 * Güvenli ayrıştırma — bozuk veri sayfayı düşürmez, çağıran hata durumu gösterir.
 * `null` dönerse içerik YOK veya BOZUKTUR; ikisi de ayrı ele alınır.
 */
export function parseAboutPage(input: unknown): AboutPage | null {
  if (input === undefined || input === null)
    return null
  const sonuc = aboutPageSchema.safeParse(input)
  if (!sonuc.success) {
    console.warn(
      '[about-page] şema doğrulaması başarısız:',
      sonuc.error.issues
        .slice(0, 3)
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join(' | '),
    )
    return null
  }
  return sonuc.data
}

/* ── Yerelleştirme ────────────────────────────────────────────────────── */

/**
 * İki dilli metinden aktif dili seçer.
 *
 * Site kuralı (`projects-grid`, `github-repos-admin`): yalnız `en` ayrı dil;
 * diğer tüm yerler taban dil (tr) gösterir. Bu sayede tek sayfada Türkçe ve
 * İngilizce İÇ İÇE GİRMEZ. `en` boş bırakılmışsa (admin henüz
 * çevirmemişse) o alan tr'ye düşer — boşluk gösterilmez.
 */
export function pickLocalized(value: Bilingual | undefined, locale: Locale): string {
  if (!value)
    return ''
  const en = (value.en ?? '').trim()
  const tr = (value.tr ?? '').trim()
  if (locale === 'en' && en)
    return en
  return tr || en
}

/** Giriş/kapanış metnini paragraflara böler (boş satır = yeni paragraf). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\r?\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
}

/** Tek kopya — admin editörü anahtar üretirken de kullanır. */
export function slugifyKey(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** `web-development` → `web-development-2` (benzersiz üreteç). */
export function uniqueKey(base: string, taken: Iterable<string>): string {
  const kok = slugifyKey(base) || 'madde'
  const set = new Set(taken)
  if (!set.has(kok))
    return kok
  let n = 2
  while (set.has(`${kok}-${n}`))
    n++
  return `${kok}-${n}`
}

/**
 * Editör/kayıt öncesi okunabilir doğrulama listesi (sunucu kapısı
 * `aboutPageSchema`; bu liste kullanıcıya AYNI kuralları Türkçe anlatır).
 */
export function aboutPageErrors(page: AboutPage): string[] {
  const hatalar: string[] = []
  const gruplar: [string, AboutItem[]][] = [
    ['Çalışma Alanları', page.areas],
    ['Yolculuk', page.journey],
    ['Değerler', page.values],
  ]
  for (const [ad, items] of gruplar) {
    const gorulen = new Map<string, number>()
    items.forEach((item, i) => {
      const no = `${ad} #${i + 1}`
      if (!aboutKeySchema.safeParse(item.key).success) {
        hatalar.push(
          `${no}: anahtar geçersiz — yalnızca küçük harf, rakam ve tire (örn: web-development).`,
        )
      }
      const onceki = gorulen.get(item.key)
      if (onceki !== undefined) {
        hatalar.push(
          `${no}: "${item.key}" anahtarı zaten #${onceki + 1} satırında kullanılmış.`,
        )
      }
      else {
        gorulen.set(item.key, i)
      }
      if (!item.title.tr.trim() && !item.title.en.trim()) {
        hatalar.push(`${no}: başlık (TR veya EN) boş olamaz.`)
      }
    })
  }
  return hatalar
}

/**
 * Şemaya UYMASA DA çalışan normalize edici.
 *
 * Neden gerekli: düzenleme sırasında geçici olarak geçersiz durumlar olur
 * (anahtar yazılırken çakışma, boş başlık). Katı şema parse ederken hata
 * fırlatırsa editör kilitlenir. Bu fonksiyon eksik alanları varsayılanla
 * doldurur, HİÇBİR ŞEY UYDURMAZ (boş metin) ve doğrulamayı çağırana bırakır.
 */
export function normalizeAboutPage(input: unknown): AboutPage {
  const ham = (input ?? {}) as Record<string, unknown>
  const metin = (v: unknown): Bilingual => {
    const o = (v ?? {}) as Record<string, unknown>
    return {
      tr: typeof o.tr === 'string' ? o.tr : '',
      en: typeof o.en === 'string' ? o.en : '',
    }
  }
  const madde = (v: unknown): AboutItem => {
    const o = (v ?? {}) as Record<string, unknown>
    return {
      key: typeof o.key === 'string' ? o.key : '',
      title: metin(o.title),
      description: metin(o.description),
      period: typeof o.period === 'string' ? o.period : '',
    }
  }
  const liste = (v: unknown): AboutItem[] =>
    Array.isArray(v) ? v.map(madde) : []

  return {
    title: metin(ham.title),
    intro: metin(ham.intro),
    areas: liste(ham.areas),
    journey: liste(ham.journey),
    values: liste(ham.values),
    closing: metin(ham.closing),
  }
}
