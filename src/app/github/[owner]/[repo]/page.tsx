import { RepoVisitCounter } from '@/components/github/repo-visit-counter'
import { Navigation } from '@/components/navigation'
import { Section, SectionTitle } from '@/components/ui/section'
import { getLocalizedContent } from '@/lib/i18n-server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string, repo: string }>
}) {
  const { owner, repo } = await params
  return { title: `${repo} — ${owner} — GitHub — TARIKELER` }
}

export default async function GithubRepoPage({
  params,
}: {
  params: Promise<{ owner: string, repo: string }>
}) {
  const content = await getLocalizedContent()
  const { owner, repo } = await params
  const githubUrl = `https://github.com/${owner}/${repo}`

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="">
        <Section className="flex-col items-center justify-center pt-32 min-h-[80svh]">
          <SectionTitle
            title=""
            subTitle={repo}
            description={`${owner}/${repo}`}
            big
          />
          {/* This visit is counted ONCE in the project's view counter (dedup). */}
          <RepoVisitCounter title={repo} githubUrl={githubUrl} />
        </Section>
      </main>
    </div>
  )
}
