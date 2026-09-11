'use client'

import { useEffect } from 'react'

/** Increments the view count in localStorage when the blog detail page is opened. */
export function TrackBlogView({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `blog-stats:${slug}`
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? '{}')
      const newViews = (stored.views ?? 0) + 1
      localStorage.setItem(key, JSON.stringify({ ...stored, views: newViews }))
    } catch {
      // silent
    }
  }, [slug])
  return null
}
