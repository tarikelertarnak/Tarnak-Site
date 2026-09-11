import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { unstable_cache } from 'next/cache'
import type { BlogPost } from '@/lib/content'

const DATA_DIR = path.join(process.cwd(), 'data')
const BLOG_FILE = path.join(DATA_DIR, 'blog', 'posts.json')

type Locale = 'tr' | 'en'

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

async function ensureBlogDir() {
  await fs.mkdir(path.join(DATA_DIR, 'blog'), { recursive: true })
}

// ---------- SUPABASE (primary) ----------

/**
 * Module-level TTL cache — no repeated fetch per page.
 * When the Supabase call times out it silently falls back to the local file
 * (no console warning; DNS is slow on this machine and it fails on first request).
 */
let supabasePostsCache: { ts: number; data: BlogPost[] } | null = null
const SUPABASE_POSTS_TTL_MS = 300_000

/**
 * 5 min ISR cache. When the blog changes from the admin panel, revalidatePath('/blog')
 * + revalidatePath(`/blog/${slug}`) refresh it immediately.
 */
const fetchPostsCached = unstable_cache(
  async (): Promise<BlogPost[]> => {
    const now = Date.now()
    if (supabasePostsCache && now - supabasePostsCache.ts < SUPABASE_POSTS_TTL_MS) {
      return supabasePostsCache.data
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
          const localPosts = new Map(local.map((p) => [p.slug, p]))
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
      } catch {
        /* local fallback is used on weak networks */
      }
    }

    supabasePostsCache = { ts: now, data: merged }
    return merged
  },
  ['blog-posts'],
  { revalidate: 300, tags: ['blog-posts'] },
)

export async function getPosts(locale: Locale = 'tr'): Promise<BlogPost[]> {
  const posts = await fetchPostsCached()
  return posts.map(p => localizePost(p, locale))
}

export async function getPostBySlug(
  slug: string,
  locale: Locale = 'tr',
): Promise<BlogPost | null> {
  // Check cache first (no network call on warm requests)
  const all = await fetchPostsCached()
  const found = all.find(post => post.slug === slug) ?? null
  return found ? localizePost(found, locale) : null
}

export async function upsertPost(post: BlogPost): Promise<void> {
  const supabase = getSupabase()
  if (supabase) {
    const existing = await supabase
      .from('posts')
      .select('id')
      .eq('slug', post.slug)
      .maybeSingle()

    const dbPost = toDbPost(post)

    if (existing.data) {
      const { error } = await supabase.from('posts').update(dbPost).eq('id', existing.data.id)
      if (error) {
        console.error('Supabase upsertPost update failed:', error.message)
      }
    } else {
      const { error } = await supabase.from('posts').insert(dbPost)
      if (error) {
        console.error('Supabase upsertPost insert failed:', error.message)
      }
    }
  }

  // Also write to the local fallback file (so it works without Supabase)
  await upsertLocalPost(post)
}

export async function deletePost(id: string): Promise<void> {
  const supabase = getSupabase()
  if (supabase) {
    // id can be either a UUID or a numeric string
    const numericId = Number(id)
    if (Number.isInteger(numericId) && numericId > 0) {
      const { error } = await supabase.from('posts').delete().eq('id', numericId)
      if (error) {
        console.error('Supabase deletePost failed:', error.message)
      }
    } else {
      // If UUID, find the slug from the local record
      const local = await getLocalPosts()
      const post = local.find(p => p.id === id)
      if (post) {
        const { error } = await supabase.from('posts').delete().eq('slug', post.slug)
        if (error) {
          console.error('Supabase deletePost by slug failed:', error.message)
        }
      }
    }
  }

  await deleteLocalPost(id)
}

// ---------- LOCAL (fallback) ----------

async function getLocalPosts(): Promise<BlogPost[]> {
  await ensureBlogDir()
  try {
    const raw = await fs.readFile(BLOG_FILE, 'utf-8')
    const posts = JSON.parse(raw) as BlogPost[]
    return posts.sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
}

async function upsertLocalPost(post: BlogPost): Promise<void> {
  await ensureBlogDir()
  const posts = await getLocalPosts()
  const index = posts.findIndex(p => p.id === post.id)
  if (index >= 0) {
    posts[index] = post
  } else {
    posts.push(post)
  }
  await fs.writeFile(BLOG_FILE, `${JSON.stringify(posts, null, 2)}\n`, 'utf-8')
}

async function deleteLocalPost(id: string): Promise<void> {
  await ensureBlogDir()
  const posts = await getLocalPosts()
  const next = posts.filter(p => p.id !== id)
  await fs.writeFile(BLOG_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf-8')
}

export function newPostId(): string {
  return randomUUID()
}
