import type { ReactNode } from 'react'
import { Navigation } from '@/components/navigation'
import {
  CodeIcon,
  CrownIcon,
  HeartIcon,
  PaletteIcon,
  ShieldIcon,
  StarIcon,
} from '@/components/ui/icons'
import { Section } from '@/components/ui/section'
import { getLocale, getLocalizedContent } from '@/lib/i18n-server'

export async function generateMetadata() {
  const locale = await getLocale()
  const isEn = locale === 'en'
  return {
    title: isEn ? 'Credits — TARIK ELER - TARNAK' : 'Katkıda Bulunanlar — TARIK ELER - TARNAK',
    description: isEn
      ? 'Everyone who contributed to TARNAK. Thanks to everyone who develops my open source projects, gives feedback and supports them.'
      : 'TARNAK\'a katkıda bulunan herkes. Açık kaynak projelerimi geliştiren, geri bildirim veren ve destekleyen herkese teşekkürler.',
  }
}

interface Contributor {
  name: string
  role: string
  roleEn: string
  roleIcon: 'crown' | 'star' | 'code' | 'heart' | 'shield' | 'palette'
  link?: string
}

const CONTRIBUTORS: Contributor[] = [
  {
    name: 'TARIK ELER',
    role: 'Kurucu & Ana Geliştirici',
    roleEn: 'Founder & Lead Developer',
    roleIcon: 'crown',
    link: 'https://github.com/TARIKELER-TARNAK',
  },
]

const TOP_DONORS = [
  { nameTr: 'Henüz yok', nameEn: 'None yet', noteTr: 'İlk destekçi sen ol!', noteEn: 'Be the first supporter!' },
]

const TESTERS = [
  { name: 'TARIK ELER', noteTr: 'Tüm test senaryoları', noteEn: 'All test scenarios' },
]

const TRANSLATORS: { lang: string, name: string, noteTr: string, noteEn: string }[] = [
  { lang: 'Türkçe', name: 'TARIK ELER', noteTr: 'Yerelleştirme & çeviri', noteEn: 'Localization & translation' },
  { lang: 'English', name: 'TARIK ELER', noteTr: 'Yerelleştirme & çeviri', noteEn: 'Localization & translation' },
]

function RoleIcon({ name }: { name: Contributor['roleIcon'] }) {
  const props = { size: 14, className: 'inline-block align-[-2px]' }
  switch (name) {
    case 'crown':
      return <CrownIcon {...props} />
    case 'star':
      return <StarIcon {...props} />
    case 'code':
      return <CodeIcon {...props} />
    case 'heart':
      return <HeartIcon {...props} />
    case 'shield':
      return <ShieldIcon {...props} />
    case 'palette':
      return <PaletteIcon {...props} />
    default:
      return null
  }
}

/** Contributor person icon — fills the left slot for rows without an avatar, keeping alignment. */
function PersonIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

/** Contributor group card — title (icon + name) + description + row list. */
function CreditGroup({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-foreground-200/10 bg-background">
      <div className="border-b border-foreground-200/10 px-6 pb-4 pt-5">
        <h2 className="flex items-center gap-3 text-lg font-bold text-foreground">
          {icon}
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm text-foreground/55">{description}</p>
        )}
      </div>
      <ul className="space-y-2 p-4 sm:p-6">{children}</ul>
    </div>
  )
}

/** Standard list item — left slot (w-10 h-10), middle text, right action (w-24). */
function CreditRow({
  left,
  title,
  subtitle,
  right,
}: {
  left: ReactNode
  title: ReactNode
  subtitle: ReactNode
  right?: ReactNode
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-foreground-200/10 bg-foreground-200/5 p-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground-200/10 text-primary">
          {left}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-foreground/55">{subtitle}</p>
        </div>
      </div>
      <div className="flex w-24 shrink-0 items-center justify-end">
        {right ?? <span className="text-foreground/40">—</span>}
      </div>
    </li>
  )
}

export default async function CreditsPage() {
  const content = await getLocalizedContent()
  const locale = await getLocale()
  const isEn = locale === 'en'

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="w-full">
        {/* Hero */}
        <Section className="flex-col pt-28 sm:pt-32 pb-12 sm:pb-16" id="credits">
          <div className="flex flex-col items-center justify-center pb-8 sm:pb-10 lg:pb-12 text-center">
            <h2 className="inline-flex items-center gap-4 border-b-4 border-primary pb-3 text-3xl font-black uppercase tracking-tight text-primary sm:text-4xl lg:text-5xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={38}
                height={38}
                viewBox="0 0 24 24"
                className="inline-block"
              >
                <g fill="none">
                  <path d="M5 3h14v12l-7 5l-7-5z" />
                  <path
                    stroke="currentColor"
                    strokeLinecap="square"
                    strokeWidth={2}
                    d="M9 8h6m-5 4h4M5 3v12l7 5l7-5V3M5 3H2m3 0h14m0 0h3"
                  />
                </g>
              </svg>
              {isEn ? 'CONTRIBUTORS' : 'KATKIDA BULUNANLAR'}
            </h2>
          </div>
        </Section>

        {/* Contributors table */}
        <Section className="flex-col pb-6 sm:pb-6">
          <div className="mx-auto w-full max-w-4xl">
            <CreditGroup
              icon={(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill="currentColor" className="text-primary">
                  <path d="M20.33 3.06a1 1 0 0 0-1.11.32L16 7.4l-3.22-4.02c-.38-.47-1.18-.47-1.56 0L8 7.4L4.78 3.38c-.27-.33-.71-.46-1.11-.32S3 3.58 3 4v15c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-.42-.27-.8-.67-.94M7.22 9.63c.38.47 1.18.47 1.56 0L12 5.61l3.22 4.02c.38.47 1.18.47 1.56 0L19 6.86v8.15H5V6.85l2.22 2.77ZM5 19.01v-2h14v2z" />
                </svg>
              )}
              title={isEn ? 'Contributors' : 'Katkıda Bulunanlar'}
            >
              {CONTRIBUTORS.map(c => (
                <CreditRow
                  key={c.name}
                  left={
                    c.name
                      .split(' ')
                      .map(w => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  }
                  title={c.name}
                  subtitle={(
                    <>
                      <RoleIcon name={c.roleIcon} />
                      {' '}
                      {isEn ? c.roleEn : c.role}
                    </>
                  )}
                  right={
                    c.link
                      ? (
                          <a
                            href={c.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-foreground-200/15 bg-background px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                          >
                            {isEn ? 'Visit' : 'Ziyaret Et'}
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" x2="21" y1="14" y2="3" />
                            </svg>
                          </a>
                        )
                      : undefined
                  }
                />
              ))}
            </CreditGroup>
          </div>
        </Section>

        {/* Testers */}
        <Section className="flex-col pb-6 sm:pb-6">
          <div className="mx-auto w-full max-w-4xl">
            <CreditGroup
              icon={(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M9 1v7L2 20v3h20v-3L15 8V1m0 17a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm-6 2a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm9-7c-7-3-6 4-12 1M6 1h12" />
                </svg>
              )}
              title={isEn ? 'Testers' : 'Test Uzmanları'}
              description={isEn ? 'People who find bugs and give feedback.' : 'Hataları bulan ve geri bildirim veren kişiler.'}
            >
              {TESTERS.map(t => (
                <CreditRow
                  key={t.name}
                  left={<PersonIcon />}
                  title={t.name}
                  subtitle={isEn ? t.noteEn : t.noteTr}
                />
              ))}
            </CreditGroup>
          </div>
        </Section>

        {/* Translators */}
        <Section className="flex-col pb-6 sm:pb-6">
          <div className="mx-auto w-full max-w-4xl">
            <CreditGroup
              icon={(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill="currentColor" className="text-primary">
                  <path d="M17 11c-.4 0-.75.23-.91.59l-4 9l1.83.81l1.07-2.41h4.03l1.07 2.41l1.83-.81l-4-9a1 1 0 0 0-.91-.59Zm-1.13 6L17 14.46L18.13 17zm-3.62-2.03l.49-1.94c-.13-.03-1.6-.43-3.17-1.42c1.4-1.41 2.49-3.26 2.74-5.61h1.68V4h-5V2h-2v2H2v2h8.3c-.25 1.91-1.19 3.34-2.31 4.4C7.3 9.75 6.68 8.96 6.25 8H4.12c.5 1.44 1.33 2.63 2.3 3.61c-1.57.99-3.04 1.39-3.17 1.42l.49 1.94c1.18-.3 2.76-.96 4.26-2.02c1.49 1.06 3.08 1.72 4.25 2.02" />
                </svg>
              )}
              title={isEn ? 'Translators' : 'Çevirmenler'}
              description={isEn ? 'People who contribute localization and translation.' : 'Yerelleştirme ve çeviri katkısı yapanlar.'}
            >
              {TRANSLATORS.map(tr => (
                <CreditRow
                  key={tr.lang}
                  left={<PersonIcon />}
                  title={(
                    <>
                      {tr.lang}
                      {' '}
                      <span className="text-foreground/40">
                        —
                        {tr.name}
                      </span>
                    </>
                  )}
                  subtitle={isEn ? tr.noteEn : tr.noteTr}
                />
              ))}
            </CreditGroup>
          </div>
        </Section>

        {/* Top Donors */}
        <Section className="flex-col pb-24 sm:pb-32">
          <div className="mx-auto w-full max-w-4xl">
            <CreditGroup
              icon={(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill="currentColor" className="text-primary">
                  <path d="m21.32 12.05l-2.23-.74c-.81-.27-1.69-.11-2.35.42l-3.4 2.72l-1.17-2.34A2 2 0 0 0 10.38 11H4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h9.62c1.17 0 2.28-.51 3.04-1.4l5.1-5.95c.22-.25.29-.6.2-.92s-.33-.58-.65-.68Zm-6.18 6.25c-.38.44-.93.7-1.52.7H4v-6h6.38l1 2H7v2h6c.23 0 .45-.08.63-.22l4.36-3.49c.13-.11.31-.14.47-.08l.81.27z" />
                  <path d="M13.28 10.69a.99.99 0 0 0 1.44 0l3.4-3.57C18.69 6.55 19 5.8 19 5s-.31-1.55-.88-2.12S16.8 2 16 2c-.06 0-1 .02-2 .7c-1-.68-1.85-.74-2-.7c-.8 0-1.56.31-2.12.88C9.31 3.45 9 4.2 9 5s.31 1.56.86 2.1l3.41 3.59Zm-1.98-6.4c.19-.19.44-.29.68-.29c.03 0 .65.04 1.31.71c.39.39 1.02.39 1.41 0c.67-.67 1.29-.71 1.29-.71a.99.99 0 0 1 1 1c0 .27-.1.52-.31.72l-2.69 2.83l-2.71-2.84c-.19-.19-.29-.44-.29-.71s.1-.52.29-.71Z" />
                </svg>
              )}
              title={isEn ? 'Top Donors' : 'En Büyük Destekçiler'}
              description={isEn ? 'People who support the projects.' : 'Projeleri destekleyen kişiler.'}
            >
              {TOP_DONORS.map((d, idx) => (
                <CreditRow
                  key={d.nameTr}
                  left={(
                    <span className="text-sm font-bold text-primary">
                      {idx + 1}
                    </span>
                  )}
                  title={isEn ? d.nameEn : d.nameTr}
                  subtitle={(
                    <a
                      href="/donate"
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      {isEn ? d.noteEn : d.noteTr}
                    </a>
                  )}
                />
              ))}
            </CreditGroup>
          </div>
        </Section>
      </main>
    </div>
  )
}
