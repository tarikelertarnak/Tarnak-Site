import type { BlogPost } from '@/lib/content'
import type { Locale } from '@/lib/i18n'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

const DATA_DIR = path.join(process.cwd(), 'data')
const BLOG_FILE = path.join(DATA_DIR, 'blog', 'posts.json')

/** Localization: if locale is 'en' and an _en variant exists, title/excerpt/content become English. */
function localizePost(post: BlogPost, locale: Locale): BlogPost {
  if (locale !== 'en' || !post.title_en) {
    return post
  }
  return {
    ...post,
    title: post.title_en,
    excerpt: post.excerpt_en ?? post.excerpt,
    content: post.content_en ?? post.content,
  }
}

/**
 * Service role client — bypasses RLS, server-side only.
 */
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) {
    return null
  }
  return createSupabaseAdmin(url, key, {
    global: {
      // Prevent page render from waiting 60s+ on weak networks: fall back after 25s
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(25_000) }),
    },
  })
}

interface DbPost {
  id: number
  slug: string
  title: string
  excerpt: string | null
  content: string
  tags: string[] | null
  cover: string | null
  published: boolean
  created_at: string
  updated_at: string
  title_en?: string | null
  excerpt_en?: string | null
  content_en?: string | null
}

function toBlogPost(row: DbPost): BlogPost {
  const date = row.created_at
    ? row.created_at.slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  return {
    id: String(row.id),
    title: row.title,
    slug: row.slug,
    date,
    excerpt: row.excerpt ?? '',
    content: row.content,
    ...(row.tags?.length ? { tags: row.tags } : {}),
    ...(row.title_en ? { title_en: row.title_en } : {}),
    ...(row.excerpt_en ? { excerpt_en: row.excerpt_en } : {}),
    ...(row.content_en ? { content_en: row.content_en } : {}),
  }
}

function toDbPost(post: BlogPost): Record<string, unknown> {
  // _en columns don't exist in the DB schema (only kept in the local file)
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    tags: post.tags?.length ? post.tags : [],
    published: true, // every post written from the admin panel is published immediately
  }
}

// ---------- SUPABASE (primary) ----------

/**
 * Onbellek — PROCESS GENELINDE paylasilir (modul seviyesinde DEGIL).
 *
 * ⚠️ NEDEN `globalThis`: onceden `let supabasePostsCache` modul seviyesindeydi.
 * Next.js'te route handler (`/api/admin/blog`) ile sayfa (`/blog`) AYRI modul
 * ornekleri olabiliyor → route'un cagirdigi `clearPostsCache()` sayfanin
 * onbellegine ULASMIYORDU. Olculdu: panelden yayinlanan yazi sitede
 * **76 saniye sonra** gorundu; silinen yazi da ayni sure boyunca gorunmeye
 * devam etti. `globalThis` ayni process icindeki tum moduller tarafindan
 * paylasildigi icin admin yazimi onbellegi ANINDA temizler.
 *
 * TTL yine de var: cok ornekli (multi-instance) dagitimlarda baska bir
 * instance'in onbellegi buradan temizlenemez — TTL onun ust siniri.
 */
const POSTS_TTL_MS = 60_000

interface PostsCache {
  ts: number
  data: BlogPost[]
}

const globalForPosts = globalThis as unknown as { __tarnakPostsCache?: PostsCache | null }

async function fetchPostsMerged(): Promise<BlogPost[]> {
  const now = Date.now()
  const cached = globalForPosts.__tarnakPostsCache
  if (cached && now - cached.ts < POSTS_TTL_MS) {
    return cached.data
  }

  const local = await getLocalPosts()

  // Read published posts from Supabase — silently fall back to local if unreachable.
  let merged = local
  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, slug, title, excerpt, content, tags, cover, published, created_at, updated_at',
        )
        .eq('published', true)
      if (!error && data?.length) {
        const localPosts = new Map(local.map(p => [p.slug, p]))
        const bySlug = new Map<string, BlogPost>()
        for (const p of local) bySlug.set(p.slug, p)
        for (const row of data as DbPost[]) {
          // Fill in from matching local record if the schema lacks _en columns
          // (admin records are written to the local file including _en).
          const localMatch = localPosts.get(row.slug)
          const post = toBlogPost(row)
          if (!post.title_en && localMatch?.title_en) {
            post.title_en = localMatch.title_en
            post.excerpt_en = localMatch.excerpt_en
            post.content_en = localMatch.content_en
          }
          bySlug.set(post.slug, post)
        }
        merged = [...bySlug.values()].sort((a, b) => b.date.localeCompare(a.date))
      }
    }
    catch {
      /* local fallback is used on weak networks */
    }
  }

  globalForPosts.__tarnakPostsCache = { ts: now, data: merged }
  return merged
}

export async function getPosts(locale: Locale = 'tr'): Promise<BlogPost[]> {
  const posts = await fetchPostsMerged()
  return posts.map(p => localizePost(p, locale))
}

export async function getPostBySlug(
  slug: string,
  locale: Locale = 'tr',
): Promise<BlogPost | null> {
  // Check cache first (no network call on warm requests)
  const all = await fetchPostsMerged()
  const found = all.find(post => post.slug === slug) ?? null
  return found ? localizePost(found, locale) : null
}

/** Invalidates the post cache (admin edits) — process genelinde gecerli. */
export function clearPostsCache(): void {
  globalForPosts.__tarnakPostsCache = null
}

/**
 * Yazma sonucu.
 *
 * Neden var: `upsertPost`/`deletePost` eskiden Supabase hatasini YALNIZCA
 * `console.error` ile yazip yutuyordu ve `void` donuyordu. Route da kosulsuz
 * `{ success: true, message: 'Yazı kaydedildi.' }` dondugu icin **yazim
 * basarisiz olsa bile panel "kaydedildi" diyordu** — kullanici yazisinin
 * yayinlandigini saniyordu. Iletisim formundaki sessiz kayipla ayni sinif hata.
 */
export interface PostWriteResult {
  ok: boolean
  /** Kalici katman (Supabase) yapilandirilmis miydi */
  supabaseConfigured: boolean
  supabaseOk: boolean
  localOk: boolean
  /**
   * Silinecek/guncellenecek kayit YOKTU.
   *
   * ⚠️ Bu ayrim sart: "kayit yok" bir ISTEK hatasidir (404), "yazamadim" bir
   * SUNUCU hatasidir (500). Ikisini ayni kodla dondurmek yanlis yonlendirir —
   * GitHub route'unda tam bu hatayi duzeltmistik, sonra burada tekrarladim
   * (api-health-scan bunu 500 olarak yakaladi).
   */
  notFound?: boolean
  error?: string
}

export async function upsertPost(post: BlogPost): Promise<PostWriteResult> {
  const supabase = getSupabase()
  let supabaseOk = false
  let error: string | undefined

  try {
    if (supabase) {
      const existing = await supabase
        .from('posts')
        .select('id')
        .eq('slug', post.slug)
        .maybeSingle()

      const dbPost = toDbPost(post)

      const res = existing.data
        ? await supabase.from('posts').update(dbPost).eq('id', existing.data.id)
        : await supabase.from('posts').insert(dbPost)

      supabaseOk = !res.error
      if (res.error) {
        error = `${res.error.code || ''} ${res.error.message}`.trim()
        console.error('[blog] upsertPost Supabase hatasi:', error)
      }
    }

    const localOk = await upsertLocalPost(post)

    // KARAR: Supabase yapilandirilmissa KALICI katman odur (production'da
    // yerel dosya kalici degil — Vercel'de salt-okunur/ephemeral, Workers'ta
    // dosya sistemi yok). Bu yuzden Supabase yazimi basarisizsa islem
    // BASARISIZ sayilir, "yerel dosyaya yazdim" diye basarili denmez.
    if (supabase) {
      return { ok: supabaseOk, supabaseConfigured: true, supabaseOk, localOk, error }
    }
    return {
      ok: localOk,
      supabaseConfigured: false,
      supabaseOk: false,
      localOk,
      error: localOk ? undefined : 'Yerel yedek dosyaya yazilamadi.',
    }
  }
  finally {
    clearPostsCache()
  }
}

export async function deletePost(id: string): Promise<PostWriteResult> {
  const supabase = getSupabase()
  let supabaseOk = false
  let notFound = false
  let error: string | undefined

  try {
    if (supabase) {
      // id can be either a UUID or a numeric string
      const numericId = Number(id)
      if (Number.isInteger(numericId) && numericId > 0) {
        // `.select('id')` ile GERCEKTEN silinen satiri dondur → "kayit yok"
        // durumunu "sildim" sanmayalim.
        const res = await supabase.from('posts').delete().eq('id', numericId).select('id')
        supabaseOk = !res.error
        if (res.error) {
          error = `${res.error.code || ''} ${res.error.message}`.trim()
          console.error('[blog] deletePost Supabase hatasi:', error)
        }
        else if (!res.data || res.data.length === 0) {
          notFound = true
          error = `Silinecek yazı bulunamadı (id=${id}).`
        }
      }
      else {
        // UUID: slug'i yerel kayittan bulup ona gore sil
        const local = await getLocalPosts()
        const post = local.find(p => p.id === id)
        if (post) {
          const res = await supabase.from('posts').delete().eq('slug', post.slug).select('id')
          supabaseOk = !res.error
          if (res.error) {
            error = `${res.error.code || ''} ${res.error.message}`.trim()
            console.error('[blog] deletePost (slug) Supabase hatasi:', error)
          }
          else if (!res.data || res.data.length === 0) {
            notFound = true
            error = `Silinecek yazı bulunamadı (slug=${post.slug}).`
          }
        }
        else {
          // Eskiden burada SESSIZCE hicbir sey yapilmiyordu ama API
          // "Yazı silindi." diyordu → yazi veritabaninda KALIYORDU.
          notFound = true
          error = `Silinecek yazı bulunamadı (id=${id}). Hiçbir kayıt silinmedi.`
          console.warn('[blog] deletePost:', error)
        }
      }
    }

    // Kayit yoksa yerel dosyayi da bosuna yazmayalim
    const localOk = notFound ? false : await deleteLocalPost(id)

    if (supabase) {
      return {
        ok: supabaseOk && !notFound,
        supabaseConfigured: true,
        supabaseOk,
        localOk,
        notFound,
        error,
      }
    }
    return {
      ok: localOk,
      supabaseConfigured: false,
      supabaseOk: false,
      localOk,
      error: localOk ? undefined : 'Yerel yedek dosya guncellenemedi.',
    }
  }
  finally {
    clearPostsCache()
  }
}

// ---------- LOCAL (fallback) ----------

/**
 * Cloudflare Workers has no filesystem — local reads/writes silently no-op.
 * Detect the worker environment (workerd sets navigator.userAgent to Cloudflare-Workers;
 * Node.js 21+ also has a navigator object but with a Node userAgent).
 */
const HAS_FS = typeof navigator === 'undefined' || !navigator.userAgent.includes('Cloudflare')

async function getLocalPosts(): Promise<BlogPost[]> {
  if (!HAS_FS)
    return []
  try {
    const raw = await fs.readFile(BLOG_FILE, 'utf-8')
    const posts = JSON.parse(raw) as BlogPost[]
    return posts.sort((a, b) => b.date.localeCompare(a.date))
  }
  catch {
    return []
  }
}

async function upsertLocalPost(post: BlogPost): Promise<boolean> {
  if (!HAS_FS)
    return false
  try {
    const posts = await getLocalPosts()
    const index = posts.findIndex(p => p.id === post.id)
    if (index >= 0) {
      posts[index] = post
    }
    else {
      posts.push(post)
    }
    await fs.writeFile(BLOG_FILE, `${JSON.stringify(posts, null, 2)}\n`, 'utf-8')
    return true
  }
  catch (error) {
    console.warn('[blog] yerel yedek dosyaya yazilamadi:', error)
    return false
  }
}

async function deleteLocalPost(id: string): Promise<boolean> {
  if (!HAS_FS)
    return false
  try {
    const posts = await getLocalPosts()
    const next = posts.filter(p => p.id !== id)
    await fs.writeFile(BLOG_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf-8')
    return true
  }
  catch (error) {
    console.warn('[blog] yerel yedek dosya guncellenemedi:', error)
    return false
  }
}

export function newPostId(): string {
  return randomUUID()
}
