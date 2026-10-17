import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { cache } from 'react'
import { sanitizeSvg } from '@/lib/svg-sanitize'
import bundledAdminJson from '../../data/admin.json'
// Cloudflare Workers has no filesystem — content is baked into the worker
// bundle at build time. Admin edits persist in-memory for the worker lifetime.
import bundledContentJson from '../../data/content.json'

/**
 * İkon değerini siteye çıkmadan önce son kez temizler (okuma sınırı).
 *
 * Kaydetme yolu (`/api/admin/icon`) zaten kanonik + temizlenmiş değer yazar,
 * ama veritabanına başka bir yoldan yazılmış işaretleme olabilir; siteye
 * `dangerouslySetInnerHTML` ile giren tek kapı burasıdır.
 */
function safeIcon(value: string | null | undefined): string {
  const v = (value ?? '').trim()
  if (!v)
    return ''
  return /^<svg[\s>]/i.test(v) ? sanitizeSvg(v) : v
}

/** Lazy path resolution — process.cwd() can be unavailable/shadowed in Workers. */
function dataDir(): string {
  try {
    return path.join(process.cwd(), 'data')
  }
 catch {
    return 'data'
  }
}

/**
 * Module-level TTL cache for the Supabase merge result.
 * Goal: avoid repeating the initial TCP/TLS connection setup (20s+ on this machine)
 * on every request. Cleared by saveContent on admin edits.
 */
let supabaseMergeCache: { ts: number, data: SiteContent | null } | null = null
const SUPABASE_CACHE_TTL_MS = 300_000

export interface ToolboxItem {
  label: string
  /**
   * Display type:
   * - 'link' → clickable external link (href)
   * - 'command' → terminal look; clicking copies the command text
   *
   * @deprecated 2026-10-16: site artık bunları LİNK olarak çizmiyor (kullanıcı
   * isteği) — "Kullandığım Teknolojiler" yalnızca hangi teknolojileri
   * bildiğimizi gösterir. Alanlar eski içerik dosyalarıyla uyum için duruyor.
   */
  type?: 'link' | 'command'
  /** URL for link type; command text copied on click for command type */
  href?: string
  /**
   * Kanonik ikon değeri: `<svg>` işaretlemesi, yerel yol, `data:` adresi,
   * görsel adresi veya `koleksiyon:ikon` (Iconify). Bkz. `lib/icon-resolve.ts`.
   */
  icon?: string
  /** 0-100 arası seviye — ikon popup'ında gösterilir. */
  level?: number
  /** Kullanıcının yazdığı açıklama — ikon popup'ında gösterilir. */
  description?: string
}

export interface TeamItem {
  name: string
  /** Short role/title — shown as a badge in the marquee strip */
  role: string
}

export interface InterestItem {
  label: string
  icon: string
  content: string
}

export interface SocialItem {
  name: string
  href: string
  icon: string
  /**
   * Görünen ad override'ı (ör. `name: 'Tarnak'` → `label: 'Discord Grubu'`).
   * Boşsa `name` kullanılır. İletişim menüsünde (`contact-channels.ts`)
   * satır başlığı olur.
   */
  label?: string
  /** Görünen değer override'ı. Boşsa `href`'ten protokol/www sökülür. */
  value?: string
}

export interface ProjectItem {
  title: string
  notice?: string
  description: string
  projectLink: string
  srcLink?: string
  image: string
  /** Multiple media (image/gif/video URLs). Falls back to `image` when empty. */
  media?: string[]
  /** Star count if GitHub repo (for popularity sorting) */
  stars?: number
  /** Fork count if GitHub repo */
  forks?: number
  /**
   * Görünürlük: `true` veya belirsizse sitede görünür, `false` ise gizli.
   */
  visible?: boolean
  isVisible?: boolean
  hidden?: boolean
  /**
   * Öne çıkan proje. `true` olanlar listenin EN ÜSTÜNDE,
   * seçili sıralamadan BAĞIMSIZ olarak sabitlenir. En fazla 3 tanesi
   * uygulanır (listenin en üstündeki 3 işaretli proje).
   *
   * GitHub projeleri otomatik olarak bu alanı taşımaz — onlar API'den
   * gelir; yalnızca admin panelinden eklenen projeler işaretlenebilir.
   */
  pinned?: boolean
  /**
   * Vaka çalışması. Alanlar boş bırakılırsa proje detay
   * sayfasında "TODO" placeholder'ı gösterilir — içerik UYDURULMAZ.
   */
  caseStudy?: {
    /** Kısa özet: projenin ne yaptığı (tek paragraf) */
    summary?: string
    /** Problem: hangi sorunu çözdü */
    problem?: string
    /** Çözüm: nasıl çözdü */
    solution?: string
    /** Sonuç: ölçülebilir çıktı varsa */
    outcome?: string
  }
  /** Watch (subscriber) count if GitHub repo */
  watchers?: number
  /** Last update date (ISO). For repos it comes from GitHub updated_at. */
  updatedAt?: string
  /**
   * Download mode:
   * - 'global' → same downloadUrl used on all OSes
   * - 'per-os' → separate URL for downloads.{windows,macos,linux,ios,android}
   */
  downloadMode?: 'global' | 'per-os'
  /** Single download link/file path in global mode */
  downloadUrl?: string
  /** Separate link/file path per OS in per-os mode */
  downloads?: {
    windows?: string
    macos?: string
    linux?: string
    ios?: string
    android?: string
  }
  /** Tags (for filtering/searching) */
  tags?: string[]
  /**
   * Yazı türü.
   *
   * · `'article'` → normal blog yazısı (varsayılan)
   * · `'til'`     → "Today I Learned": kısa, tek konulu öğrenme notu
   *
   * Ayrı `badge`'den FARKLI: badge görsel rozet metni, bu tip davranışı
   * ve listeleme mantığını belirler. İkisi birlikte kullanılabilir.
   */
  kind?: 'article' | 'til'
}

export interface NavItem {
  title: string
  href: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  date: string
  excerpt: string
  content: string
  badge?: string
  tags?: string[]
  /**
   * Yazı türü.
   *
   * · `'article'` → normal blog yazısı (varsayılan)
   * · `'til'`     → "Today I Learned": kısa, tek konulu öğrenme notu
   *
   * `badge`'den FARKLI: badge yalnızca görsel rozet metnidir, bu alan
   * davranışı ve listeleme mantığını belirler. İkisi birlikte de kullanılabilir.
   */
  kind?: 'article' | 'til'
  /** English variants — shown if present and locale is 'en'. */
  title_en?: string
  excerpt_en?: string
  content_en?: string
}

export interface ChatFile {
  name: string
  type: string
  size: number
  url: string
}

export interface ChatMessage {
  id: string
  name: string
  text: string
  createdAt: number
  file?: ChatFile
  to?: string
  owner?: boolean
}

export interface CvEntry {
  role: string
  company: string
  period: string
  description: string
}

export interface CvData {
  href: string
  summary: string
  experience: CvEntry[]
  education: CvEntry[]
}

export interface SiteContent {
  hero: {
    name: string
    tagline: string
    badge: string
    description: string
    exploreLabel: string
    connectLabel: string
    emoji: string
    stats: { label: string, value: string }[]
  }
  nav: {
    ctaLabel: string
    githubRepo: string
    items: NavItem[]
  }
  social: SocialItem[]
  about: {
    subtitle: string
    title: string
    description: string
    whoTitle: string
    whoText: string
    toolboxTitle: string
    toolboxDescription: string
    toolbox: ToolboxItem[]
    /**
     * "Bildiğim Diller" tablosundan gelen satırlar (2026-10-16). Boşsa site
     * `profile.firstLanguage/otherLanguages` metinlerini gösterir.
     */
    languages?: { name: string, level: string }[]
    beyondTitle: string
    beyondDescription: string
    interests: InterestItem[]
    securityTitle: string
    securityText: string
    securityTools: ToolboxItem[]
    /** "Our team" marquee strip — title + role badges */
    teamTitle: string
    team: TeamItem[]
    cv: CvData
  }
  projects: {
    subtitle: string
    title: string
    description: string
    items: ProjectItem[]
  }
  github: {
    subtitle: string
    title: string
    description: string
  }
  chat: {
    subtitle: string
    title: string
    description: string
  }
  profile: {
    firstName: string
    lastName: string
    displayName: string
    nickname: string
    title: string
    profileImage: string
    /**
     * Kırpmadan ÖNCEki orijinal görsel (admin panelinde saklanır). Kullanıcı
     * kırpmayı sıfırdan yeniden ayarlayabilsin diye tutulur; eski kayıtta
     * yoktur → opsiyonel.
     */
    originalImage?: string
    experience: string
    firstLanguage: string
    otherLanguages: string
  }
  contact: {
    subtitle: string
    title: string
    description: string
    footerText: string
    successTitle: string
    successText: string
    /** Shown on the contact cards (entered in admin/content.json) */
    email: string
    phone: string
    /** Map button (Google Maps) */
    location: string
    /** Map button (Yandex Maps) */
    locationYandex: string
  }
  settings: {
    githubUsername: string
    defaultTheme: 'light' | 'dark' | 'system'
    backgroundImage: string
    /** Music player media URL (optional) */
    musicSrc?: string
  }
  footer: {
    copyright: string
  }
  /**
   * Ek bölümler (availability, services, testimonials, timeline,
   * certificates, uses, now, changelog, newsletter, videos, vcard,
   * privacy, kvkk).
   *
   * Opsiyonel: kullanıcı bu alanı hiç doldurmazsa sayfalar boş durum
   * gösterir. Doğrulama `phase6Schema` ile yapılır — bozuk veri build'i
   * düşürmez, ilgili bölüm boş sayılır.
   */
  phase6?: unknown
  /**
   * `/about` sayfasının içeriği (2026-10-17).
   *
   * Şema `src/lib/about-page.ts`'te; `aboutPageSchema` ile doğrulanır.
   *
   * Neden yeni anahtar: `/about` sayfasındaki biyografi (hayalet tarihler,
   * uydurma istatistikler) TypeScript sabitlerine gömülüydü ve admin
   * panelinden değiştirilemiyordu. Artık içeriğin TEK kaynağı bu alandır —
   * kaynak koda fallback YOKTUR. Yoksa/boşsa sayfa yerelleştirilmiş boş
   * durum gösterir.
   */
  aboutPage?: unknown
}

const bundledContent = bundledContentJson as Partial<SiteContent>
const bundledAdmin = bundledAdminJson as unknown as AdminCredentials

const CONTENT_FILE = () => path.join(dataDir(), 'content.json')
const ADMIN_FILE = () => path.join(dataDir(), 'admin.json')

async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir(), { recursive: true })
  }
 catch {
    /* Workers: no-op */
  }
}

/**
 * Module-level TTL cache for the merged content result.
 * The site is server-rendered; content.json is baked into the OpenNext worker
 * bundle at build time (data/ is copied into the worker), so no ISR cache is
 * needed on Cloudflare. `cache()` (React) already dedupes per-request.
 */
let contentMergeCache: { ts: number, data: SiteContent | null } | null = null
const CONTENT_CACHE_TTL_MS = 300_000

/**
 * Reads site content (content.json + Supabase merge).
 * React cache makes it run only once per request
 * (layout / page / generateMetadata don't wait again in the same request).
 *
 * Merged result is cached for 5 min (module-level TTL); saveContent clears it
 * immediately after an edit from the admin panel.
 */
/**
 * Supabase `site_content` okuma/yazma (2026-10-06).
 *
 * Workers'ta `fs.writeFile` SALT-OKUNUR; içeriğin kalıcı olması için
 * Postgres'e yazılması gerekiyor. Tablo kurulumu:
 *   supabase/site-content.sql → Supabase SQL Editor'de bir kez çalıştır.
 *
 * Tablo yoksa/erişilemiyorsa `null` döner ve çağıran taraf diske
 * düşer — site çalışmaya devam eder.
 */
async function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) {
    return null
  }
  return createSupabaseAdmin(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
    },
  })
}

/**
 * İçerik kaynağının durumu (2026-10-17).
 *
 * Neden: "okuma başarısız" ile "kayıt yok" AYNI ŞEY DEĞİLDİR. `getContent()`
 * hataları yutup paketlenmiş JSON'a düştüğü için çağıran taraf ikisini ayırt
 * edemiyordu; boş içerik gösterip hatayı başarı saymak sessiz veri kaybına
 * yol açar. Sayfalar (örn. `/about`) bu bayrağa bakıp hata durumu gösterir.
 * Yalnız `site_content` okumasını izler.
 */
export interface ContentSourceStatus {
  supabase: 'ok' | 'missing' | 'error' | 'unconfigured'
  error?: string
}

let contentSourceStatus: ContentSourceStatus = { supabase: 'unconfigured' }

export function getContentSourceStatus(): ContentSourceStatus {
  return contentSourceStatus
}

async function readSupabaseContent(): Promise<Partial<SiteContent> | null> {
  const supabase = await getSupabaseAdmin()
  if (!supabase) {
    contentSourceStatus = { supabase: 'unconfigured' }
    return null
  }
  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('content')
      .eq('id', 'main')
      .maybeSingle()
    if (error) {
      contentSourceStatus = { supabase: 'error', error: error.message }
      /*
       * Teşhis logu (sır YOK — yalnız tablo/izin mesajı). En sık iki neden:
       * `supabase/site-content.sql` çalıştırılmadı (PGRST205) veya servis
       * rolü anahtarı yanlış (401/403). Sessizce boş içerik gösterip
       * "kaydedildi" demek yerine görünür olsun.
       */
      console.error(
        `[content] site_content okunamadı: ${error.message} — supabase/site-content.sql çalıştırıldı mı?`,
      )
      return null
    }
    if (!data?.content) {
      contentSourceStatus = { supabase: 'missing' }
      return null
    }
    const content = data.content as Record<string, unknown>
    // Boş satır (tablo yeni oluşturulmuşsa) diskten okunmalı.
    if (Object.keys(content).length === 0) {
      contentSourceStatus = { supabase: 'missing' }
      return null
    }
    contentSourceStatus = { supabase: 'ok' }
    return content as Partial<SiteContent>
  }
 catch (error) {
    contentSourceStatus = {
      supabase: 'error',
      error: error instanceof Error ? error.message : String(error),
    }
    return null
  }
}

export async function saveContentToSupabase(
  content: SiteContent,
): Promise<PersistResult | null> {
  const supabase = await getSupabaseAdmin()
  if (!supabase) {
    return null
  }
  try {
    const { error } = await supabase
      .from('site_content')
      .upsert(
        { id: 'main', content, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      )
    if (error) {
      throw new Error(error.message)
    }
    return { ok: true }
  }
 catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('[content] Supabase yazma basarisiz:', detail)
    return { ok: false, error: `Supabase yazma başarısız (${detail}).` }
  }
}

export const getContent = cache(async (): Promise<SiteContent> => {
  if (
    contentMergeCache
    && Date.now() - contentMergeCache.ts < CONTENT_CACHE_TTL_MS
  ) {
    return contentMergeCache.data as SiteContent
  }

  /*
    İÇERİK KAYNAĞI (2026-10-06) — öncelik sırası:
      1. Supabase `site_content` (id='main')  ← KALICI, Workers'ta çalışır
      2. `data/content.json` (paketlenmiş)    ← build-time yedek

    Neden değişti: `saveContent()` yalnızca diske yazıyordu. Workers
    dosya sistemi salt-okunur → yazma EROFS ile başarısız, içerik her
    deploy'da geri alınıyordu. Supabase tablosu kurulduğunda
    (supabase/site-content.sql) okuma da oradan yapılacak.

    Tablo yoksa veya erişilemiyorsa paketlenmiş JSON'a düşüyoruz —
    site çalışmaya devam eder, sadece admin kayıtları kalıcı olmaz.
  */
  let parsed: Partial<SiteContent> | null = null
  const fromSupabase = await readSupabaseContent()
  if (fromSupabase) {
    parsed = fromSupabase
  }
 else {
    try {
      const raw = await fs.readFile(CONTENT_FILE(), 'utf-8')
      parsed = JSON.parse(raw) as Partial<SiteContent>
    }
 catch {
      parsed = null
    }
  }
  const defaults = await getDefaultContent()
  const base: SiteContent = mergeContent(defaults, parsed ?? bundledContent)
  const merged = await mergeSupabase(base)
  contentMergeCache = { ts: Date.now(), data: merged }
  return merged
})

/**
 * Merges project / skill / stats data from Supabase into content.
 * If Supabase is not configured or errors, the existing (content.json) data is kept.
 */
async function mergeSupabase(base: SiteContent): Promise<SiteContent> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) {
    return base
  }

  // TTL cache: don't call Supabase over the network on warm requests
  if (
    supabaseMergeCache
    && Date.now() - supabaseMergeCache.ts < SUPABASE_CACHE_TTL_MS
  ) {
    return supabaseMergeCache.data ?? base
  }

  const supabase = createSupabaseAdmin(url, key, {
    global: {
      // Prevent render from waiting 60s+ on weak networks: fall back after 25s
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(25_000) }),
    },
  })

  const merged = { ...base }

  // Three queries are independent — run them in parallel (cuts render time on cold cache).
  // Fail silently: page render is not blocked on slow DNS / offline,
  // data from content.json is preserved.
  const silent = (label: string) => (error: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `Supabase ${label} merge skipped:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  await Promise.all([
    (async () => {
      try {
        // Projects — DB rows override the local record when title matches;
        // unmatched local (content.json) records are KEPT (no full replacement).
        const { data: dbProjects, error: projectError } = await supabase
          .from('projects')
          .select(
            'slug, title, description, tech, repo_url, demo_url, image, featured',
          )
          .order('sort_order', { ascending: true })
        if (projectError)
throw projectError
        // `featured` DB'de tutulur ama KARTTA gösterilmez — kullanıcı
        // "[Featured]" etiketini kaldırmamı istedi. Sıralama kullanmıyorsa
        // alan tamamen boşta kalmasın diye okumuyoruz.
        const dbItems = (dbProjects ?? []).map(p => ({
          title: p.title,
          description: p.description ?? '',
          projectLink: p.demo_url ?? p.repo_url ?? '#',
          ...(p.repo_url ? { srcLink: p.repo_url } : {}),
          image: p.image ?? '',
        }))
        if (dbItems.length) {
          const dbTitles = new Set(dbItems.map(p => p.title))
          merged.projects.items = [
            ...dbItems,
            ...merged.projects.items.filter(p => !dbTitles.has(p.title)),
          ]
        }
      }
 catch (error) {
        silent('projects')(error)
      }
    })(),
    (async () => {
      try {
        /* Skills = sitedeki "Kullandığım Teknolojiler" (toolbox) listesi.
           `level`/`description` de okunur: ikon popup'ında gösterilir.
           `icon` KANONİK değerdir (bkz. lib/icon-resolve.ts) ama fazladan
           güvence için okuma sınırında da temizlenir — siteye temizlenmemiş
           işaretleme asla ulaşmaz. */
        const { data: dbSkills, error: skillError } = await supabase
          .from('skills')
          .select('label, icon, level, description')
          .order('sort_order', { ascending: true })
        if (!skillError && dbSkills?.length) {
          merged.about.toolbox = dbSkills.map(s => ({
            label: s.label,
            icon: safeIcon(s.icon),
            level: typeof s.level === 'number' ? s.level : undefined,
            description: s.description ?? undefined,
          }))
        }
      }
 catch (error) {
        silent('skills')(error)
      }
    })(),
    (async () => {
      try {
        /* "Bildiğim Diller" tablosu (2026-10-16). Tablo yoksa sorgu hata verir
           ve mevcut profil metinleri (firstLanguage/otherLanguages) yürürlükte
           kalır — site bozulmaz. */
        const { data: dbLanguages, error: langError } = await supabase
          .from('languages')
          .select('language, level')
          .order('sort_order', { ascending: true })
        if (!langError && dbLanguages?.length) {
          merged.about.languages = dbLanguages.map(l => ({
            name: l.language,
            level: l.level ?? '',
          }))
        }
      }
 catch (error) {
        silent('languages')(error)
      }
    })(),
    (async () => {
      try {
        // Stats (hero)
        const { data: dbStats, error: statError } = await supabase
          .from('stats')
          .select('projects, technologies, focus')
          .eq('id', 1)
          .maybeSingle()
        if (!statError && dbStats) {
          merged.hero.stats = [
            { label: 'Projects', value: `${dbStats.projects}+` },
            { label: 'Technologies', value: `${dbStats.technologies}+` },
            { label: 'Focus', value: `${dbStats.focus}%` },
          ]
        }
      }
 catch (error) {
        silent('stats')(error)
      }
    })(),
  ])

  supabaseMergeCache = { ts: Date.now(), data: merged }
  return merged
}

function mergeContent(
  defaults: SiteContent,
  parsed: Partial<SiteContent>,
): SiteContent {
  return {
    ...defaults,
    ...parsed,
    hero: { ...defaults.hero, ...(parsed.hero ?? {}) },
    nav: { ...defaults.nav, ...(parsed.nav ?? {}) },
    about: {
      ...defaults.about,
      ...(parsed.about ?? {}),
      toolbox: parsed.about?.toolbox ?? defaults.about.toolbox,
      interests: parsed.about?.interests ?? defaults.about.interests,
      securityTools:
        parsed.about?.securityTools ?? defaults.about.securityTools,
      cv: {
        ...defaults.about.cv,
        ...(parsed.about?.cv ?? {}),
        experience:
          parsed.about?.cv?.experience ?? defaults.about.cv.experience,
        education: parsed.about?.cv?.education ?? defaults.about.cv.education,
      },
    },
    projects: {
      ...defaults.projects,
      ...(parsed.projects ?? {}),
      items: parsed.projects?.items ?? defaults.projects.items,
    },
    github: { ...defaults.github, ...(parsed.github ?? {}) },
    chat: { ...defaults.chat, ...(parsed.chat ?? {}) },
    profile: { ...defaults.profile, ...(parsed.profile ?? {}) },
    contact: { ...defaults.contact, ...(parsed.contact ?? {}) },
    settings: { ...defaults.settings, ...(parsed.settings ?? {}) },
    footer: { ...defaults.footer, ...(parsed.footer ?? {}) },
    social: parsed.social ?? defaults.social,
  }
}

/**
 * Kalicilastirma sonucu.
 *
 * ⚠️ Neden var: `saveContent`/`saveAdmin` yalnizca YEREL dosya sistemine
 * yaziyor ve hatayi yutuyordu. Production **Vercel** (`Server: Vercel`) ve
 * Vercel'de proje dizini SALT-OKUNURDUR (`/tmp` disinda). Yani canlida yazim
 * `EROFS` ile duser, hata yutulur ve API yine de "Kaydedildi." der →
 * kullanici kaydettigini sanar, degisiklik KAYBOLUR.
 *
 * Artik yazimin gercekten basarili olup olmadigi donduruluyor. Platformdan
 * bagimsiz: yazim calisiyorsa (yerel dev) sonuc ok:true, calismiyorsa
 * ok:false ve SEBEBI.
 */
export interface PersistResult {
  ok: boolean
  error?: string
}

export async function saveContent(
  content: SiteContent,
): Promise<PersistResult> {
  let result: PersistResult

  /*
    SIRALAMA (2026-10-06):
      1. Önce SUPABASE — Workers'ta tek kalıcı seçenek bu.
      2. Supabase yoksa/yazılamadıysa diske dene (Node geliştirme,
         Docker, VPS gibi yazılabilir FS'lerde çalışır).
      3. İkisi de olmazsa `ok:false` + açıklayıcı hata.

    ÖNCEKİ DAVRANIŞ: yalnızca diske yazıyordu. Workers'ta EROFS →
    "Kalıcı değil" uyarısı → her deploy'da içerik geri alınıyordu.
  */
  const supabaseResult = await saveContentToSupabase(content)
  if (supabaseResult?.ok) {
    result = { ok: true }
  }
 else if (supabaseResult) {
    // Supabase var ama yazılamadı — diske de dene.
    result = (await trySaveToDisk(content)) ?? supabaseResult
  }
 else {
    result = (await trySaveToDisk(content)) ?? {
      ok: false,
      error:
        'Ne Supabase ne dosya sistemi yapılandırılmamış — içerik kaydedilemedi.',
    }
  }

  // Refresh the caches after an admin edit
  supabaseMergeCache = null
  contentMergeCache = null
  return result
}

/** Diske yazmayı dener; diske yazılamıyorsa `null` döner. */
async function trySaveToDisk(
  content: SiteContent,
): Promise<PersistResult | null> {
  try {
    await ensureDataDir()
    await fs.writeFile(
      CONTENT_FILE(),
      `${JSON.stringify(content, null, 2)}\n`,
      'utf-8',
    )
    return { ok: true }
  }
 catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('[content] saveContent diske yazamadi:', detail)
    return {
      ok: false,
      error:
        `İçerik kalıcı olarak yazılamadı (${detail}). `
        + 'Sunucu dosya sistemi salt-okunur olabilir — değişiklik yeniden deploy sonrası kaybolur.',
    }
  }
}

export interface AdminCredentials {
  username: string
  passwordHash: string
}

export async function getAdmin(): Promise<AdminCredentials> {
  try {
    const raw = await fs.readFile(ADMIN_FILE(), 'utf-8')
    return JSON.parse(raw) as AdminCredentials
  }
 catch {
    return bundledAdmin
  }
}

export async function saveAdmin(
  admin: AdminCredentials,
): Promise<PersistResult> {
  try {
    await ensureDataDir()
    await fs.writeFile(
      ADMIN_FILE(),
      `${JSON.stringify(admin, null, 2)}\n`,
      'utf-8',
    )
    return { ok: true }
  }
 catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('[content] saveAdmin yazamadi:', detail)
    return {
      ok: false,
      error:
        `Şifre kalıcı olarak kaydedilemedi (${detail}). `
        + 'Sunucu dosya sistemi salt-okunur olabilir (Vercel) — ESKİ ŞİFRE geçerli kalmaya devam eder.',
    }
  }
}

async function getDefaultContent(): Promise<SiteContent> {
  return {
    hero: {
      name: 'TARIK ELER',
      tagline: 'Yazılımcı & Sistem Mimarı',
      badge: '',
      // Sabit bio metni kaldırıldı; admin `hero.description` alanına yazınca
      // hero içinde kendiliğinden görünür (hero-section.tsx koşullu render).
      description: '',
      exploreLabel: 'Projeleri Keşfet',
      connectLabel: 'İletişime Geç',
      emoji: '🚀',
      stats: [],
    },
    nav: {
      ctaLabel: 'GitHub',
      githubRepo: 'https://github.com/tarikelertarnak',
      items: [
        { title: 'Projects', href: '/projects' },
        { title: 'Blog', href: '/blog' },
        { title: 'Chat', href: '/chat' },
        { title: 'Feedback', href: '/contact/' },
      ],
    },
    social: [
      {
        name: 'GitHub',
        href: 'https://github.com/tarikelertarnak',
        icon: 'mdi:github',
      },
      {
        name: 'Instagram',
        href: 'https://www.instagram.com/',
        icon: 'mdi:instagram',
      },
      {
        name: 'YouTube',
        href: 'https://www.youtube.com/',
        icon: 'mdi:youtube',
      },
      {
        name: 'TikTok',
        href: 'https://www.tiktok.com/',
        icon: 'ic:baseline-tiktok',
      },
    ],
    about: {
      subtitle: 'ABOUT ME',
      title: 'A Glimpse Into My World',
      description:
        'Learn more about me, what I do, and what I\'m passionate about.',
      whoTitle: 'Who I Am',
      whoText:
        'I\'m a web developer who loves to code and build things. I\'m passionate about web development, design, and technology.',
      toolboxTitle: 'My Toolbox',
      toolboxDescription:
        'Explore the technologies I use to build projects and websites.',
      toolbox: [
        { label: 'Next.js', type: 'link', href: 'https://nextjs.org' },
        { label: 'Tailwind', type: 'link', href: 'https://tailwindcss.com' },
        {
          label: 'TypeScript',
          type: 'link',
          href: 'https://www.typescriptlang.org',
        },
        { label: 'Docker', type: 'link', href: 'https://www.docker.com' },
        {
          label: 'PostgreSQL',
          type: 'link',
          href: 'https://www.postgresql.org',
        },
        { label: 'React', type: 'link', href: 'https://react.dev' },
        { label: 'Node.js', type: 'link', href: 'https://nodejs.org' },
        { label: 'Git', type: 'link', href: 'https://git-scm.com' },
        {
          label: 'C#',
          type: 'link',
          href: 'https://dotnet.microsoft.com/languages/csharp',
        },
        {
          label: 'npx create next-app',
          type: 'command',
          href: 'npx create-next-app@latest my-app',
        },
      ],
      beyondTitle: 'Beyond the Code',
      beyondDescription:
        'Explore my interests, hobbies, and what I do when I\'m not coding.',
      interests: [
        {
          label: 'Hardware',
          icon: 'mdi:laptop',
          content:
            'I love building and tinkering with computers and other tech.',
        },
        {
          label: 'Music',
          icon: 'mdi:music',
          content:
            'I\'m a big fan of music and love discovering new artists and genres.',
        },
        {
          label: 'AI',
          icon: 'mdi:creation',
          content:
            'I love working on my AI projects and trying out new models and tools.',
        },
      ],
      securityTitle: '',
      securityText: '',
      securityTools: [],
      teamTitle: 'THE TEAM',
      team: [
        { name: 'TARIKELER', role: 'Founder' },
        { name: 'tarikelertarnak', role: 'Infra' },
        { name: 'Fruity Dev', role: 'DevOps' },
        { name: 'PixelShield', role: 'Security' },
        { name: 'Mythora.de', role: 'Operations' },
      ],
      cv: {
        href: '/cv/tarikeler-cv.pdf',
        summary:
          'Web developer building modern, end-to-end web experiences with Next.js, TypeScript and AI. From design to deploy — I ship products people use.',
        experience: [],
        education: [
          {
            role: '11th Grade — Technical Information Systems',
            company:
              'K-Tek (Kılıçarslan Borsa İstanbul Vocational and Technical Anatolian High School)',
            period: 'Studying',
            description:
              'I am an 11th grade student in the Technical Information Systems track.',
          },
        ],
      },
    },
    projects: {
      subtitle: 'PROJECTS',
      title: 'All Projects',
      description: 'Projects I\'ve built and worked on.',
      items: [],
    },
    github: {
      subtitle: 'GITHUB',
      title: 'GitHub Sayfam',
      description:
        'My public repositories, pulled live from my GitHub profile.',
    },
    chat: {
      // Sadece `subtitle` okunuyor: /chat artik HAKKIMDA ile ayni
      // `SectionTitle big` yapisini kullanir (ikon + buyuk harf baslik).
      // `title`/`description` alanlari sunucu tarafi semada zorunlu oldugu
      // icin duruyor ama sayfada render EDILMIYOR — eski "Chat With Me /
      // Leave a message..." metni tamamen kaldirildi (kullanici istegi).
      subtitle: 'CHAT',
      title: '',
      description: '',
    },
    profile: {
      firstName: 'TARIK',
      lastName: 'ELER',
      displayName: 'TARIKELER',
      nickname: 'Tarnak',
      title: '',
      profileImage: '/uploads/profile.png',
      experience: '',
      firstLanguage: 'Turkish',
      otherLanguages: 'English (A2), German (A1)',
    },
    contact: {
      subtitle: 'Contact',
      title: 'Contact',
      description: '',
      footerText: '',
      successTitle: 'Message has been delivered!',
      successText:
        'Thank you for reaching out! I\'ve received your message and will get back to you as soon as possible.',
      email: '',
      phone: '',
      location: '',
      locationYandex: '',
    },
    settings: {
      githubUsername: 'tarikelertarnak',
      defaultTheme: 'dark',
      backgroundImage: '',
    },
    footer: {
      copyright: 'TARIKELER',
    },
  }
}
