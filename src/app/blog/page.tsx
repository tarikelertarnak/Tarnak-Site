import { Navigation } from '@/components/navigation'
import { RememberListPath } from '@/components/remember-list-path'
import { BlogSection } from '@/components/sections/blog-section'
import { getPosts } from '@/lib/blog'
import { getLocale, getLocalizedContent } from '@/lib/i18n-server'

export const revalidate = 300

export default async function BlogPage() {
  const locale = await getLocale()
  const [posts, content] = await Promise.all([
    getPosts(locale),
    getLocalizedContent(),
  ])

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <RememberListPath path="/blog" />
      <main id="main" className="contents">
        <BlogSection posts={posts} />
      </main>
    </div>
  )
}