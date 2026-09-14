import type { MetadataRoute } from 'next'
import { getPosts } from '@/lib/blog'

export const dynamic = 'force-static'

const SITE_URL = 'https://tarikeler-tarnak.github.io'

/** Static route -> lastModified (ISO). Everything is pre-rendered; blog items are static too. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/projects`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/donate`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/credits`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/github`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ]

  let blogPages: MetadataRoute.Sitemap = []
  try {
    const posts = await getPosts('tr')
    blogPages = posts.map(post => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  }
  catch {
    // Static export on some hosts re-runs sitemap; keep blog pages out if lookup fails.
  }

  return [...staticPages, ...blogPages]
}