import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TrackBlogView } from '@/app/blog/[slug]/track-view'
import { BackToListButton } from '@/components/back-to-list-button'
import { Navigation } from '@/components/navigation'
import { getPostBySlug, getPosts } from '@/lib/blog'
import { t } from '@/lib/i18n'
import { getLocale, getLocalizedContent } from '@/lib/i18n-server'
import { renderMarkdown } from '@/lib/markdown'

export const revalidate = 300
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const posts = await getPosts()
  return posts.map(post => ({ slug: post.slug }))
}
interface PostPageProps {
  params: Promise<{ slug: string }>
}
export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const post = await getPostBySlug(slug, locale)
  return { title: post ? `${post.title} - Blog` : 'Blog' }
}
export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params
  const locale = await getLocale()
  const post = await getPostBySlug(slug, locale)
  if (!post) {
    notFound()
  }
  const content = await getLocalizedContent()
  return (
    <div className="min-h-screen w-full relative">
      {' '}
      <Navigation content={content} />
      {' '}
      <TrackBlogView slug={post.slug} />
      {' '}
      <main
        id="main"
        className="md:ml-[240px] relative z-10 mx-auto flex w-full max-w-3xl flex-col px-4 sm:px-6 py-24 sm:py-32"
      >
        {' '}
        <div className="mb-6 flex items-center gap-3">
          {' '}
          <BackToListButton fallback="/blog" />
          {' '}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-foreground-500 transition-colors hover:text-primary"
          >
            {' '}
            {t(locale, 'blog.backToBlog')}
            {' '}
          </Link>
          {' '}
        </div>
        {' '}
        <article className="rounded-large bg-background p-4 sm:p-8 lg:p-10 ">
          {' '}
          <header className="mb-6 flex flex-col gap-2">
            {' '}
            <p className="text-xs sm:text-sm text-foreground-500">
              {' '}
              {new Date(post.date).toLocaleDateString(
                locale === 'tr' ? 'tr-TR' : 'en-GB',
                { day: 'numeric', month: 'long', year: 'numeric' },
              )}
              {' '}
            </p>
            {' '}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
              {post.title}
            </h1>
            {' '}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-1 flex flex-row flex-wrap gap-1.5">
                {post.tags.map(tag => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {' '}
          </header>
          {' '}
          <div
            className="markdown-body text-sm sm:text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />
          {' '}
        </article>
        {' '}
      </main>
      {' '}
    </div>
  )
}
