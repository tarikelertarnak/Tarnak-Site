import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Section, SectionTitle } from '@/components/ui/section'
import { getPosts } from '@/lib/blog'
import { getContent } from '@/lib/content'
import { clientFetchUserRepos } from '@/lib/github-client'
import { getLocale, getLocalizedContent } from '@/lib/i18n-server'

export async function generateMetadata() {
  const locale = await getLocale()
  return {
    title: locale === 'en' ? 'Search — TARIK ELER - TARNAK' : 'Arama — TARIK ELER - TARNAK',
  }
}

export const dynamic = 'force-dynamic'

interface ProjectHit {
  type: 'project'
  title: string
  description: string
  href: string
}

interface BlogHit {
  type: 'blog'
  title: string
  description: string
  href: string
  date?: string
  tags?: string[]
}

type SearchHit = ProjectHit | BlogHit

function match(q: string, fields: (string | undefined)[]) {
  const needle = q.toLowerCase()
  return fields.some(f => f && f.toLowerCase().includes(needle))
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = (searchParams.q ?? '').trim()
  const content = await getLocalizedContent()
  const baseContent = await getContent()
  const locale = await getLocale()
  const isEn = locale === 'en'

  let hits: SearchHit[] = []

  if (q) {
    // Project hits
    const projectHits: ProjectHit[] = baseContent.projects.items
      .filter(p =>
        match(q, [p.title, p.description, ...(p.tags ?? [])]),
      )
      .map(p => ({
        type: 'project' as const,
        title: p.title,
        description: p.description,
        href: p.projectLink,
      }))

    // Blog hits
    let blogHits: BlogHit[] = []
    try {
      const posts = await getPosts()
      blogHits = posts
        .filter(p => match(q, [p.title, p.excerpt, ...(p.tags ?? [])]))
        .map(p => ({
          type: 'blog' as const,
          title: p.title,
          description: p.excerpt,
          href: `/blog/${p.slug}`,
          date: p.date,
          tags: p.tags,
        }))
    }
    catch {
      /* noop */
    }

    // GitHub project hits (best-effort)
    let githubHits: ProjectHit[] = []
    try {
      if (baseContent.settings.githubUsername) {
        const repos = await clientFetchUserRepos(
          baseContent.settings.githubUsername,
        )
        githubHits = repos
          .filter(r => match(q, [r.name, r.description ?? '', ...(r.topics ?? [])]))
          .map(r => ({
            type: 'project' as const,
            title: r.name,
            description: r.description ?? '',
            href: `/github/${r.fullName}`,
          }))
      }
    }
    catch {
      /* noop */
    }

    hits = [...projectHits, ...githubHits, ...blogHits]
  }

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="w-full">
        <Section
          className="flex-col pt-28 sm:pt-32 pb-16"
          id="search"
        >
          <div className="mx-auto w-full max-w-3xl">
            <SectionTitle
              title=""
              subTitle={isEn ? 'SEARCH' : 'ARAMA'}
              description={
                q
                  ? isEn
                    ? `${hits.length} result${hits.length === 1 ? '' : 's'} found for "${q}"`
                    : `"${q}" için ${hits.length} sonuç bulundu`
                  : isEn
                    ? 'Search across projects, blog posts and GitHub repos.'
                    : 'Projeler, blog yazıları ve GitHub repolarında arayın.'
              }
              big
            />

            {/* Inline search form */}
            <form
              action="/search"
              method="get"
              className="mt-6 flex w-full"
            >
              <div className="relative flex h-12 w-full items-center">
                <svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 text-foreground/50"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder={isEn ? 'What are you looking for?' : 'Aramak istediğiniz şeyi yazın...'}
                  className="h-12 w-full rounded-xl border border-foreground-200/15 bg-background pl-11 pr-4 text-base text-foreground outline-none transition-colors placeholder:text-foreground-500/60 focus:border-primary/60"
                  autoFocus
                />
              </div>
            </form>

            {/* Results */}
            {q
              ? (
                  hits.length > 0
                    ? (
                        <div className="mt-8 flex flex-col gap-3">
                          {hits.map((hit, idx) => (
                            <Link
                              key={`${hit.type}-${idx}`}
                              href={hit.href}
                              className="group flex flex-col gap-1.5 rounded-xl border border-foreground-200/10 bg-background p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                            >
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                                  {hit.type === 'blog' ? (isEn ? 'Blog' : 'Blog') : isEn ? 'Project' : 'Proje'}
                                </span>
                                <h3 className="text-base font-semibold text-foreground group-hover:text-primary">
                                  {hit.title}
                                </h3>
                              </div>
                              <p className="line-clamp-2 text-sm text-foreground-500">
                                {hit.description}
                              </p>
                              {hit.type === 'blog' && hit.tags && hit.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {hit.tags.slice(0, 3).map(tag => (
                                    <span
                                      key={tag}
                                      className="rounded-full bg-foreground-200/10 px-2 py-0.5 text-[10px] text-foreground-600"
                                    >
                                      #
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      )
                    : (
                        <p className="mt-8 text-center text-sm text-foreground-500">
                          {isEn ? 'No results found.' : 'Hiç sonuç bulunamadı.'}
                        </p>
                      )
                )
              : null}
          </div>
        </Section>
      </main>
    </div>
  )
}
