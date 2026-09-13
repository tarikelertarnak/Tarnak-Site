'use client'

import type { BlogPost } from '@/lib/content'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { FadeUpSection } from '@/components/fade-up-section'
import { useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  CloseIcon,
  EyeIcon,
  NewspaperIcon,
  SearchIcon,
} from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import { Section, SectionTitle } from '@/components/ui/section'
import { StarRating } from '@/components/ui/star-rating'

type SortKey = 'newest' | 'oldest' | 'az' | 'za' | 'views'

const SORT_LABEL_KEYS: Record<SortKey, string> = {
  newest: 'blog.sortNewest',
  oldest: 'blog.sortOldest',
  az: 'blog.sortAz',
  za: 'blog.sortZa',
  views: 'blog.sortViews',
}

// The initial value is 4 so it divides evenly across both 1 and 2 columns:
const INITIAL_POST_COUNT = 4
const POST_INCREMENT = 4 // Or 2

/** localStorage counters for blog cards (slug-based). */
function useBlogStats(slug: string) {
  const [views, setViews] = useState(0)

  useEffect(() => {
    const key = `blog-stats:${slug}`
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? '{}')
      setViews(Number(stored.views) || 0)
    }
    catch {
      setViews(0)
    }
  }, [slug])

  return { views }
}

function BlogStats({ slug }: { slug: string }) {
  const { views } = useBlogStats(slug)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-foreground-200/15 bg-background px-1.5 py-0.5 text-foreground/80"
      title="Görüntülenme"
    >
      <EyeIcon size={12} />
      {' '}
      {views}
    </span>
  )
}

export function BlogSection({ posts }: { posts: BlogPost[] }) {
  const { t, locale } = useT()
  const pathname = usePathname()
  const onBlogPage = pathname === '/blog' || pathname === '/blog/'
  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [sort, setSort] = useState<SortKey>('newest')
  const [visibleCount, setVisibleCount] = useState(INITIAL_POST_COUNT)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    posts.forEach((p) => {
      p.tags?.forEach(tag => set.add(tag))
    })
    return Array.from(set)
  }, [posts])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = posts.filter((p) => {
      const matchQuery
        = !q
          || p.title.toLowerCase().includes(q)
          || p.excerpt.toLowerCase().includes(q)
          || (p.tags?.some(tag => tag.toLowerCase().includes(q)) ?? false)
      const matchTag
        = activeTags.length === 0
          || (p.tags?.some(tag => activeTags.includes(tag)) ?? false)
      return matchQuery && matchTag
    })

    list = [...list]
    const viewsOf = (slug: string): number => {
      if (typeof window === 'undefined')
        return 0
      try {
        const d = JSON.parse(
          localStorage.getItem(`blog-stats:${slug}`) ?? '{}',
        )
        return Number(d.views) || 0
      }
      catch {
        return 0
      }
    }
    switch (sort) {
      case 'az':
        list.sort((a, b) =>
          a.title.localeCompare(b.title, locale === 'tr' ? 'tr' : 'en'),
        )
        break
      case 'za':
        list.sort((a, b) =>
          b.title.localeCompare(a.title, locale === 'tr' ? 'tr' : 'en'),
        )
        break
      case 'oldest':
        list.sort((a, b) => a.date.localeCompare(b.date))
        break
      case 'views':
        list.sort((a, b) => viewsOf(b.slug) - viewsOf(a.slug))
        break
      default: // newest
        list.sort((a, b) => b.date.localeCompare(a.date))
    }
    return list
  }, [posts, query, activeTags, sort, locale])

  const shown = filtered.slice(0, visibleCount)

  const handleShowMore = () => {
    setVisibleCount(prev => Math.min(prev + POST_INCREMENT, filtered.length))
  }

  // Show the button only when cards actually remain and the next click adds at least 1 new card
  // (no empty clicks).
  const hasMore = shown.length < filtered.length
  const remaining = filtered.length - shown.length

  const dateFmt = (date: string) =>
    new Date(date).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  return (
    <Section className="flex-col pt-16 sm:pt-24 lg:pt-32" id="blog" framed>
      <FadeUpSection className="flex w-full flex-col">
        <SectionTitle
          title=""
          subTitle={t('blog.sub')}
          description={t('blog.desc')}
          icon={<NewspaperIcon size={36} className="inline-block" />}
          big
        />

        {!onBlogPage && (
          <div className="mb-4 flex w-full max-w-6xl flex-row flex-wrap items-center justify-center gap-2">
            <Button
              href="/blog"
              color="primary"
              className="h-11 items-center gap-2 rounded-lg bg-[#e5e7eb] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#d1d5db]"
              endContent={<span aria-hidden="true">→</span>}
            >
              {t('blog.all')}
            </Button>
          </div>
        )}

        {/* Tools: search + tag + sort */}
        <div className="mb-6 flex w-full max-w-6xl flex-col gap-3">
          {/* Search — below the title, above the filters */}
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('blog.search')}
            aria-label={t('blog.search')}
            className="h-11 w-full"
            startContent={<SearchIcon size={16} />}
          />

          <div className="flex w-full flex-row flex-wrap items-center gap-2">
            <SearchableCombobox
              options={(Object.keys(SORT_LABEL_KEYS) as SortKey[]).map(
                v => ({ value: v, label: t(SORT_LABEL_KEYS[v]) }),
              )}
              selected={[sort]}
              onSelect={v => setSort(v as SortKey)}
              onClear={() => setSort('newest')}
              placeholder={t('blog.sort')}
              searchPlaceholder={t('blog.searchSort')}
              ariaLabel={t('blog.sort')}
            />

            {allTags.length > 0 && (
              <SearchableCombobox
                multiple
                options={allTags.map(tag => ({
                  value: tag,
                  label: `#${tag}`,
                }))}
                selected={activeTags}
                onSelect={v =>
                  setActiveTags(prev =>
                    prev.includes(v)
                      ? prev.filter(x => x !== v)
                      : [...prev, v],
                  )}
                onClear={() => setActiveTags([])}
                placeholder={t('blog.allTags')}
                searchPlaceholder={t('blog.searchTag')}
                ariaLabel={t('blog.allTags')}
                showAllOption
                allLabel={t('combobox.all')}
                badge={activeTags.length}
              />
            )}
          </div>

          {/* Active filter chips — clicked tags, removed with an x */}
          {activeTags.length > 0 && (
            <div className="flex flex-row flex-wrap items-center gap-1.5">
              {activeTags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                >
                  #
                  {tag}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTags(prev =>
                        prev.filter(x => x !== tag),
                      )}
                    aria-label={`${t('blog.removeTag')} ${tag}`}
                    className="-mr-1 grid h-4 w-4 cursor-pointer place-items-center rounded-full transition-colors hover:bg-primary/20"
                  >
                    <CloseIcon size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {shown.length === 0
          ? (
              <p className="text-center text-foreground-500">{t('blog.empty')}</p>
            )
          : (
              <div className="grid w-full max-w-6xl grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {shown.map(post => (
                  <a key={post.id} href={`/blog/${post.slug}`} className="group">
                    <div className="flex h-full flex-col gap-3 rounded-3xl border border-foreground-200/15 bg-background p-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-xl group-hover:shadow-primary/5">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-row items-center justify-between gap-2">
                          <p className="text-xs text-foreground-500">
                            {dateFmt(post.date)}
                          </p>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-row gap-1">
                              {post.tags.slice(0, 2).map(tag => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <h2 className="mt-1 text-lg sm:text-xl font-semibold line-clamp-2 group-hover:text-primary">
                          {post.title}
                        </h2>
                      </div>
                      <div className="flex flex-1 flex-col justify-between gap-3">
                        <p className="text-sm text-foreground-500 line-clamp-3">
                          {post.excerpt}
                        </p>
                        <div className="mt-auto flex flex-row flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2 text-[11px] text-foreground/75">
                            <StarRating
                              itemId={post.slug}
                              itemType="blog"
                              size={14}
                              showCount
                            />
                            <BlogStats slug={post.slug} />
                          </div>
                          <span className="ml-auto inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[#e5e7eb] px-4 py-2 text-sm font-medium text-black transition-all duration-200 hover:bg-[#d1d5db]">
                            {t('projects.open')}
                            {' '}
                            <ArrowUpRightIcon size={16} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

        {hasMore && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
            <Button
              variant="solid"
              color="primary"
              onPress={handleShowMore}
              endContent={<ChevronDownIcon size={18} />}
            >
              {t('projects.showMore')}
              {' '}
              (
              {remaining}
              )
            </Button>
          </div>
        )}
      </FadeUpSection>
    </Section>
  )
}
