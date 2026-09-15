import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { cache } from 'react'
import bundledAdminJson from '../../data/admin.json'
// Cloudflare Workers has no filesystem — content is baked into the worker
// bundle at build time. Admin edits persist in-memory for the worker lifetime.
import bundledContentJson from '../../data/content.json'

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

/**
 * The Supabase skills table only carries `label, icon` (no href column).
 * Real links for known labels are completed here; unknown labels stay as
 * plain chips (ToolboxItem link behavior is optional).
 */
const SKILL_LABEL_LINKS: Record<string, string> = {
  'Next.js': 'https://nextjs.org',
  'Tailwind': 'https://tailwindcss.com',
  'Tailwind CSS': 'https://tailwindcss.com',
  'Docker': 'https://www.docker.com',
  'Node.js': 'https://nodejs.org',
  'Git': 'https://git-scm.com',
  'Python': 'https://www.python.org',
  'HTML': 'https://developer.mozilla.org/en-US/docs/Web/HTML',
  'Html': 'https://developer.mozilla.org/en-US/docs/Web/HTML',
  'CSS': 'https://developer.mozilla.org/en-US/docs/Web/CSS',
  'JavaScript': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  'TypeScript': 'https://www.typescriptlang.org',
  'React': 'https://react.dev',
  'PostgreSQL': 'https://www.postgresql.org',
  'C#': 'https://learn.microsoft.com/en-us/dotnet/csharp/',
  'C++': 'https://en.cppreference.com',
}

export interface ToolboxItem {
  label: string
  /**
   * Display type:
   * - 'link' → clickable external link (href)
   * - 'command' → terminal look; clicking copies the command text
   */
  type?: 'link' | 'command'
  /** URL for link type; command text copied on click for command type */
  href?: string
  /** Backward compatibility — no longer used in rendering (SVG instead of iconify) */
  icon?: string
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
}

const bundledContent = bundledContentJson as Partial<SiteContent>
const bundledAdmin = bundledAdminJson as unknown as AdminCredentials

const CONTENT_FILE = () => path.join(dataDir(), 'content.json')
const ADMIN_FILE = () => path.join(dataDir(), 'admin.json')

async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir(), { recursive: true })
  }
  catch { /* Workers: no-op */ }
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
export const getContent = cache(async (): Promise<SiteContent> => {
  if (contentMergeCache && Date.now() - contentMergeCache.ts < CONTENT_CACHE_TTL_MS) {
    return contentMergeCache.data as SiteContent
  }

  // fs.readFile works on Node (dev/build-time writes are read live);
  // on Workers the bundled JSON is the source of truth.
  let parsed: Partial<SiteContent> | null = null
  try {
    const raw = await fs.readFile(CONTENT_FILE(), 'utf-8')
    parsed = JSON.parse(raw) as Partial<SiteContent>
  }
  catch {
    parsed = null
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
  if (supabaseMergeCache && Date.now() - supabaseMergeCache.ts < SUPABASE_CACHE_TTL_MS) {
    return supabaseMergeCache.data ?? base
  }

  const supabase = createSupabaseAdmin(url, key, {
    global: {
      // Prevent render from waiting 60s+ on weak networks: fall back after 25s
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(25_000) }),
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
          .select('slug, title, description, tech, repo_url, demo_url, image, featured')
          .order('sort_order', { ascending: true })
        if (projectError)
          throw projectError
        const dbItems = (dbProjects ?? []).map(p => ({
          title: p.title,
          notice: p.featured ? '[Featured]' : undefined,
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
        // Skills (toolbox / marquee)
        const { data: dbSkills, error: skillError } = await supabase
          .from('skills')
          .select('label, icon')
          .order('sort_order', { ascending: true })
        if (!skillError && dbSkills?.length) {
          merged.about.toolbox = dbSkills.map(s => ({
            label: s.label,
            icon: s.icon,
            type: 'link' as const,
            href: SKILL_LABEL_LINKS[s.label] ?? '',
          }))
        }
      }
      catch (error) {
        silent('skills')(error)
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

function mergeContent(defaults: SiteContent, parsed: Partial<SiteContent>): SiteContent {
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
      securityTools: parsed.about?.securityTools ?? defaults.about.securityTools,
      cv: {
        ...defaults.about.cv,
        ...(parsed.about?.cv ?? {}),
        experience: parsed.about?.cv?.experience ?? defaults.about.cv.experience,
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

export async function saveContent(content: SiteContent): Promise<void> {
  try {
    await ensureDataDir()
    await fs.writeFile(CONTENT_FILE(), `${JSON.stringify(content, null, 2)}\n`, 'utf-8')
  }
  catch {
    // Cloudflare Workers has no filesystem — content is baked at build time;
    // the in-memory cache is still refreshed below so the edit takes effect
    // for the lifetime of this worker instance (until the next deploy).
  }
  // Refresh the Supabase merge cache after an admin edit
  supabaseMergeCache = null
  contentMergeCache = null
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

export async function saveAdmin(admin: AdminCredentials): Promise<void> {
  try {
    await ensureDataDir()
    await fs.writeFile(ADMIN_FILE(), `${JSON.stringify(admin, null, 2)}\n`, 'utf-8')
  }
  catch {
    // Cloudflare Workers: no filesystem. In-memory only until next deploy.
  }
}

async function getDefaultContent(): Promise<SiteContent> {
  return {
    hero: {
      name: 'TARIK ELER',
      tagline: 'Yazılımcı & Sistem Mimarisi',
      badge: '',
      description:
        'Next.js, TypeScript ve yapay zeka ile modern web deneyimleri üretiyorum. Tasarımdan deploy\u2019a kadar uçtan uca çalışırım.',
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
        { title: 'Feedback', href: '/#contact' },
      ],
    },
    social: [
      { name: 'GitHub', href: 'https://github.com/tarikelertarnak', icon: 'mdi:github' },
      { name: 'Instagram', href: 'https://www.instagram.com/', icon: 'mdi:instagram' },
      { name: 'YouTube', href: 'https://www.youtube.com/', icon: 'mdi:youtube' },
      { name: 'TikTok', href: 'https://www.tiktok.com/', icon: 'ic:baseline-tiktok' },
    ],
    about: {
      subtitle: 'ABOUT ME',
      title: 'A Glimpse Into My World',
      description: 'Learn more about me, what I do, and what I\'m passionate about.',
      whoTitle: 'Who I Am',
      whoText:
        'I\'m a web developer who loves to code and build things. I\'m passionate about web development, design, and technology.',
      toolboxTitle: 'My Toolbox',
      toolboxDescription: 'Explore the technologies I use to build projects and websites.',
      toolbox: [
        { label: 'Next.js', type: 'link', href: 'https://nextjs.org' },
        { label: 'Tailwind', type: 'link', href: 'https://tailwindcss.com' },
        { label: 'TypeScript', type: 'link', href: 'https://www.typescriptlang.org' },
        { label: 'Docker', type: 'link', href: 'https://www.docker.com' },
        { label: 'PostgreSQL', type: 'link', href: 'https://www.postgresql.org' },
        { label: 'React', type: 'link', href: 'https://react.dev' },
        { label: 'Node.js', type: 'link', href: 'https://nodejs.org' },
        { label: 'Git', type: 'link', href: 'https://git-scm.com' },
        { label: 'C#', type: 'link', href: 'https://dotnet.microsoft.com/languages/csharp' },
        { label: 'npx create next-app', type: 'command', href: 'npx create-next-app@latest my-app' },
      ],
      beyondTitle: 'Beyond the Code',
      beyondDescription: 'Explore my interests, hobbies, and what I do when I\'m not coding.',
      interests: [
        {
          label: 'Hardware',
          icon: 'mdi:laptop',
          content: 'I love building and tinkering with computers and other tech.',
        },
        {
          label: 'Gaming',
          icon: 'mdi:gamepad-variant',
          content: 'I enjoy playing video games, especially with friends.',
        },
        {
          label: 'Fitness',
          icon: 'mdi:gym',
          content: 'I like to stay active and go to the gym regularly.',
        },
        {
          label: 'Music',
          icon: 'mdi:music',
          content: 'I\'m a big fan of music and love discovering new artists and genres.',
        },
        {
          label: 'Cybersecurity',
          icon: 'mdi:shield-lock',
          content:
            'I enjoy pentesting, CTF challenges, and hunting for vulnerabilities on bug bounty platforms.',
        },
      ],
      securityTitle: 'Cybersecurity & CTF',
      securityText:
        'Passionate about cybersecurity. I enjoy learning new techniques and taking on security challenges.',
      securityTools: [
        { label: 'TryHackMe', icon: 'simple-icons:tryhackme' },
        { label: 'HackerOne', icon: 'simple-icons:hackerone' },
      ],
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
        experience: [
          {
            role: 'Founder & Full-Stack Developer',
            company: 'Fruity Dev',
            period: 'Active',
            description:
              'Professional web development services — high-quality, scalable web applications for clients.',
          },
          {
            role: 'Owner & Developer',
            company: 'Mythora.de',
            period: 'Active',
            description:
              'Fully self-developed German Minecraft SMP network welcoming players from around the world.',
          },
          {
            role: 'Developer',
            company: 'PixelShield',
            period: 'Active',
            description:
              'DDoS protection service for Minecraft servers — protocol-aware filtering for Java, Bedrock and Geyser.',
          },
          {
            role: 'Developer',
            company: 'Portfolio & GitHub Projects',
            period: 'Ongoing',
            description:
              'Browser extensions, AI tools and utilities published on GitHub (Scribd-Download, AI-Jailbreak, Accentra, CodeHub and more).',
          },
        ],
        education: [
          {
            role: 'Self-Taught Developer',
            company: 'Computer Science & Software Engineering',
            period: 'Continuous',
            description:
              'Hands-on learning across web development, cybersecurity, CTF and bug bounty platforms.',
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
      title: 'GitHub Projects',
      description: 'My public repositories, pulled live from my GitHub profile.',
    },
    chat: {
      subtitle: 'CHAT',
      title: 'Talk To Me',
      description: 'Leave a message or just say hello. It shows up right away.',
    },
    profile: {
      firstName: 'TARIK',
      lastName: 'ELER',
      displayName: 'TARIKELER',
      nickname: 'Tarnak',
      title: 'Yazılımcı & Sistem Mimarisi',
      profileImage: 'https://avatars.githubusercontent.com/u/184168415?v=4',
      experience: '3+ Yıl',
      firstLanguage: 'Türkçe',
      otherLanguages: 'İngilizce (B1)',
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
