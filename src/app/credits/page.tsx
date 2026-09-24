import { Navigation } from '@/components/navigation'
import {
  CreditsBrowser,
  type ContributorItem,
  type DonorItem,
  type TeamItem,
  type TesterItem,
  type TranslatorItem,
} from '@/components/credits/credits-browser'
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

const CONTRIBUTORS: ContributorItem[] = [
  {
    name: 'TARIK ELER',
    role: 'Kurucu & Ana Geliştirici',
    roleEn: 'Founder & Lead Developer',
    roleIcon: 'crown',
    link: 'https://github.com/tarikelertarnak',
  },
]

const TEAM: TeamItem[] = [
  {
    name: 'Tarık Eler',
    role: 'Kurucu & Geliştirici',
    roleEn: 'Founder & Developer',
  },
]

const TOP_DONORS: DonorItem[] = [
  { nameTr: 'Henüz yok', nameEn: 'None yet', noteTr: 'İlk destekçi sen ol!', noteEn: 'Be the first supporter!' },
]

const TESTERS: TesterItem[] = [
  { name: 'TARIK ELER', noteTr: 'Tüm test senaryoları', noteEn: 'All test scenarios' },
]

const TRANSLATORS: TranslatorItem[] = [
  { lang: 'Türkçe', name: 'TARIK ELER', noteTr: 'Yerelleştirme & çeviri', noteEn: 'Localization & translation' },
  { lang: 'English', name: 'TARIK ELER', noteTr: 'Yerelleştirme & çeviri', noteEn: 'Localization & translation' },
]

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

        {/* Contributors / Team / Sponsors — searchable, filterable, sortable */}
        <Section className="flex-col pb-24 sm:pb-32">
          <CreditsBrowser
            contributors={CONTRIBUTORS}
            team={TEAM}
            testers={TESTERS}
            translators={TRANSLATORS}
            topDonors={TOP_DONORS}
          />
        </Section>
      </main>
    </div>
  )
}