import { Navigation } from '@/components/navigation'
import { GithubIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'
import { getLocale, getLocalizedContent } from '@/lib/i18n-server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string }>
}) {
  const { owner } = await params
  return { title: `${owner} — GitHub — TARIKELER` }
}

export default async function GithubOwnerPage({
  params,
}: {
  params: Promise<{ owner: string }>
}) {
  const content = await getLocalizedContent()
  const locale = await getLocale()
  const isEn = locale === 'en'
  const { owner } = await params
  const githubUrl = `https://github.com/${owner}`

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="">
        <Section className="flex-col items-center justify-center pt-32 min-h-[80svh]">
          <SectionTitle
            title=""
            subTitle={owner}
            description={
              isEn
                ? `Repositories of ${owner} will be listed here soon.`
                : `${owner} kullanıcısının repo'ları yakında burada listelenecek.`
            }
            big
          />
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#e5e7eb] px-3 text-sm font-medium text-black no-underline transition-colors hover:bg-[#d1d5db]"
          >
            <GithubIcon size={15} />
            {isEn ? 'Open GitHub' : 'GitHub\'da aç'}
          </a>
        </Section>
      </main>
    </div>
  )
}
