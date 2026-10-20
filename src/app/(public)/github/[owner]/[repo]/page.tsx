import type { Metadata } from 'next'
import type { ProjectItem } from '@/lib/content'
import { Breadcrumb, BreadcrumbJsonLd } from '@/components/breadcrumb'
import { CodeCopyEnhancer } from '@/components/code-copy-enhancer'
import { FadeUpSection } from '@/components/fade-up-section'
import { RepoVisitCounter } from '@/components/github/repo-visit-counter'
import { Navigation } from '@/components/navigation'
import { Section, SectionTitle } from '@/components/ui/section'
import { fetchRepoDetails } from '@/lib/github'
import { getLocalizedContent } from '@/lib/i18n-server'
import { renderMarkdown } from '@/lib/markdown'
import { pageMetadata } from '@/lib/page-metadata'

/**
 * Proje detay sayfası — vaka çalışması formatı
 *
 * ÖNCE: bu sayfa yalnızca `owner/repo` yazısı gösteren bir STUB'tu. Gerçek
 * repo görünümü (`GithubRepoView`, 903 satır) hiçbir yerde import
 * edilmediği için 2026-10-07'de ölü kod olarak silinmişti — yani bu sayfa
 * fiilen boştu. Şimdi gerçek veriyi basıyor.
 *
 * VERİ: `fetchRepoDetails()` GitHub API'sinden alır (`forceStatic: true` →
 * build'de cache'lenir; çalışma zamanında Workers'a istek atmaz, 1102 CPU
 * limitine takılmaz). İçerik `content.projects` içindeki admin kaydından
 * `caseStudy` alanları gelir.
 *
 * ⚠️ İÇERİK UYDURULMADI: vaka çalışması alanları boşsa sayfada açıkça
 * "TODO" placeholder'ı gösterilir (ortak kural).
 */

export const dynamic = 'force-static'

export async function generateStaticParams(): Promise<
  Array<{ owner: string, repo: string }>
> {
  return [
    { owner: 'tarikelertarnak', repo: 'tarnak' },
    { owner: 'tarikelertarnak', repo: 'blog-site' },
  ]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string, repo: string }>
}): Promise<Metadata> {
  const { owner, repo } = await params
  return pageMetadata({
    path: `/github/${owner}/${repo}`,
    title: `${repo}`,
    description: `${owner}/${repo} — kaynak kodu, dokümantasyon ve vaka çalışması.`,
  })
}

export default async function GithubRepoPage({
  params,
}: {
  params: Promise<{ owner: string, repo: string }>
}) {
  const content = await getLocalizedContent()
  const { owner, repo } = await params
  const githubUrl = `https://github.com/${owner}/${repo}`

  // GitHub API'si; hata verirse sayfa ÇÖKMEZ (aşağıda yakalanıyor).
  let detay: Awaited<ReturnType<typeof fetchRepoDetails>> | null = null
  try {
    detay = await fetchRepoDetails(owner, repo, { forceStatic: true })
  }
 catch {
    detay = null
  }

  /*
    Vaka çalışması alanları admin panelinden (`content.projects`) gelir.
    GitHub reposu için admin kaydı yoksa `undefined` → placeholder gösterilir.
  */
  // `content.projects` bir GRUP nesnesi: { subtitle, title, description, items }.
  // Kayıtlar `items` dizisinde.
  const adminKaydi = (content.projects?.items ?? []).find((p: ProjectItem) =>
    (p.srcLink ?? '').includes(`/${owner}/${repo}`),
  )
  const vaka = adminKaydi?.caseStudy

  const crumb = [
    { label: 'Ana sayfa', href: '/' },
    { label: 'Projeler', href: '/projects/' },
    { label: repo, href: `/github/${owner}/${repo}/` },
  ]

  return (
    <div className="min-h-screen w-full relative">
      <Navigation />
      <main id="main" className="w-full">
        <div className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6 sm:pt-28">
          <Breadcrumb items={crumb} />
          <BreadcrumbJsonLd items={crumb} />
        </div>

        {/* ── Başlık + sayılar ─────────────────────────────────────── */}
        <Section className="flex-col items-center justify-center pt-8 pb-0">
          <SectionTitle
            title={repo}
            subTitle={detay?.description ?? `${owner}/${repo}`}
            description=""
            big
          />

          {detay && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-foreground/60">
              {detay.language && <span>{detay.language}</span>}
              <span>
★
{detay.stars}
</span>
              <span>
⑂
{detay.forks}
</span>
              <span>{detay.license ?? 'Lisans belirtilmemiş'}</span>
              <span>
                <time dateTime={detay.updatedAt}>
                  {detay.updatedAt.slice(0, 10)}
                </time>
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              GitHub
            </a>
            {detay?.homepage && (
              <a
                href={detay.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-md border border-foreground-200/15 px-3.5 text-[13px] font-medium transition-colors hover:border-primary/50"
              >
                Canlı demo
              </a>
            )}
          </div>

          <RepoVisitCounter title={repo} githubUrl={githubUrl} />
        </Section>

        <div aria-hidden className="h-[var(--section-gap)]" />

        {/* ── Vaka çalışması ───────────────────────────────────────── */}
        <Section className="flex-col pb-0">
          <FadeUpSection className="mx-auto w-full max-w-3xl">
            <SectionTitle
              title="Vaka çalışması"
              subTitle=""
              description=""
              tightGap
            />

            <div className="mt-6 space-y-6">
              {vaka?.summary && (
                <section>
                  <h3 className="text-base font-semibold">Kısa özet</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
                    {vaka.summary}
                  </p>
                </section>
              )}

              {vaka?.problem && (
                <section>
                  <h3 className="text-base font-semibold">Problem</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
                    {vaka.problem}
                  </p>
                </section>
              )}

              {vaka?.solution && (
                <section>
                  <h3 className="text-base font-semibold">Çözüm</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
                    {vaka.solution}
                  </p>
                </section>
              )}

              {vaka?.outcome && (
                <section>
                  <h3 className="text-base font-semibold">Sonuç</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
                    {vaka.outcome}
                  </p>
                </section>
              )}

              {/* TODO (kullanıcı): admin panelinden bu proje için vaka
                  çalışması alanlarını doldur. Boş bırakılan her bölüm
                  burada görünür — uydurma metin yazılmadı. */}
              {!vaka?.summary
                && !vaka?.problem
                && !vaka?.solution
                && !vaka?.outcome && (
                  <div className="rounded-xl border border-foreground/10 p-5">
                    <p className="text-sm text-foreground/60">
                      Bu proje için vaka çalışması henüz yazılmadı.
                    </p>
                  </div>
                )}
            </div>

            {/* ── Kullanılan teknolojiler ───────────────────────────── */}
            {detay?.topics && detay.topics.length > 0 && (
              <>
                <div aria-hidden className="h-[var(--section-gap)]" />
                <section>
                  <h3 className="text-base font-semibold">
                    Kullanılan teknolojiler
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {detay.topics.map(t => (
                      <li
                        key={t}
                        className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/70"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </FadeUpSection>
        </Section>

        <div aria-hidden className="h-[var(--section-gap)]" />

        {/* ── README ───────────────────────────────────────────────── */}
        <Section className="flex-col pb-0">
          <FadeUpSection className="mx-auto w-full max-w-3xl">
            <h2 className="mb-4 text-lg font-bold">README</h2>
            {detay?.readme ? (
              <div
                className="markdown-body text-sm leading-relaxed sm:text-base"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(detay.readme),
                }}
              />
            ) : (
              <p className="rounded-xl border border-foreground/10 p-5 text-sm text-foreground/60">
                README bulunamadı veya yüklenemedi.
{' '}
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  GitHub&apos;de görüntüle
                </a>
              </p>
            )}
          </FadeUpSection>
        </Section>

        <div aria-hidden className="h-[var(--section-gap)]" />
      </main>
      {/* Kod bloklarına "Kopyala" düğmesi */}
      <CodeCopyEnhancer />
    </div>
  )
}
