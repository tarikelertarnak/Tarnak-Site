import { Navigation } from '@/components/navigation'
import { OpenGitHub, OwnerSoon } from '@/components/owner-i18n'
import { GithubIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'

/**
 * GitHub sahip sayfası (`/github/[owner]`).
 *
 * 2026-10-20: `getLocale()` + `isEn` sunucu dallanması KALDIRILDI —
 * dynamic route (1102 riski) + `force-static` altında boş cookie yüzünden
 * TR ziyaretçiye İngilizce basma (ters-hata) sorunlarını birlikte çözüyor.
 * Metin artık istemcide (`owner-i18n.tsx`).
 */
export const dynamic = 'force-static'

export async function generateStaticParams(): Promise<
  Array<{ owner: string }>
> {
  // Static export için bilinen owner'ları üret
  return [{ owner: 'tarikelertarnak' }]
}

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
  const { owner } = await params
  const githubUrl = `https://github.com/${owner}`

  return (
    <div className="min-h-screen w-full relative">
      <Navigation />
      <main id="main" className="">
        <Section className="flex-col items-center justify-center pt-32 min-h-[80svh]">
          <SectionTitle
            title=""
            subTitle={owner}
            description=""
            big
          />
          <p className="mt-4 max-w-md text-center text-sm text-foreground/60">
            <OwnerSoon owner={owner} />
          </p>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-foreground/10 px-3 text-sm font-medium text-foreground no-underline transition-colors hover:bg-foreground/20"
          >
            <GithubIcon size={15} />
            <OpenGitHub />
          </a>
        </Section>
      </main>
    </div>
  )
}
