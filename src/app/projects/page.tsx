import type { Metadata } from 'next'
import { Navigation } from '@/components/navigation'
import { ProjectsGrid } from '@/components/projects/projects-grid'
import { RememberListPath } from '@/components/remember-list-path'
import { FolderIcon, GithubIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'
import { getStaticLocalizedContent } from '@/lib/i18n-server'

// 2026-10-03: ISR KALDIRILDI. revalidate=300 incremental cache (KV) her render'da bir OKUMA+YAZMA yapiyordu; Workers Free 10 ms CPU limitinde bu I/O worker'i asiliyordu (/donate 20 sn+ sonsuz timeout, bazen 200). Sayfa artik tam statik: KV yok, render yok. Admin icerik degisikligi deploy ile yayinlanir.
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Projeler — TARIK ELER - TARNAK',
  description:
    'TARIK ELER (Tarnak) tarafından geliştirilen açık kaynak projeler: masaüstü uygulamalar, web araçları, tarayıcı eklentileri ve yapay zeka projeleri. Windows, macOS ve Linux için indirilebilir sürümler.',
  alternates: { canonical: '/projects' },
  openGraph: {
    title: 'Projeler — TARIK ELER - TARNAK',
    description:
      'Açık kaynak projeler: masaüstü uygulamalar, web araçları, tarayıcı eklentileri ve yapay zeka projeleri.',
    url: '/projects',
    type: 'website',
  },
}

export default async function ProjectsPage() {
  const content = await getStaticLocalizedContent()

  return (
    <div className="min-h-screen w-full relative">
      <Navigation />
      <RememberListPath path="/projects" />
      <main id="main" className="w-full">
        {/*
            BOŞLUK DENGESİ (2026-10-06, kullanıcı: "üstteki yazılarla
            alttaki kısımın boşlukları eşit ve ortalanmış olsun").

            Ölçüm (localhost, canlı):
              projeler : navbar→başlık 157px, başlık→içerik  40px  ← DENGSİZ
              hakkımda : navbar→başlık 148px, başlık→içerik 136px  ← dengeli

            Sebep: başlık `framed` kutunun İÇİNDEydi; kutunun 40px iç
            dolgusu başlığın üstüne eklendiği için yukarıdaki boşluk
            şişiyor, aşağıdaki kalıyordu.

            Çözüm: başlık kendi `Section`'ında (çerçevesiz), içerik ayrı
            `framed` Section'da — `/about/` ile ana sayfanın yaptığı gibi.
            İki boşluk artık bağımsız ayarlanabiliyor.
          */}
        {/* `pb-16 sm:pb-24 lg:pb-24`: ölçümle ayarlandı — navbar→başlık
            128px (2026-10-13, breadcrumb kaldırılınca), başlık→çerçeve 136px.
            `/about/` ile birebir aynı (128/136). */}
        <Section className="flex-col pt-28 sm:pt-32 pb-16 sm:pb-24 lg:pb-24">
          <SectionTitle
            title=""
            subTitle={content.projects.subtitle}
            description={content.projects.description}
            icon={<FolderIcon size={36} className="inline-block" />}
            headingLevel="h1"
            big
          />
        </Section>

        <Section className="flex-col pb-16 sm:pb-20 lg:pb-24" framed>
          {/* GitHub Projects button */}
          <div className="mx-auto flex w-full max-w-6xl flex-row flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/tarikelertarnak?tab=repositories"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg no-underline transition-colors hover:bg-primary/90"
            >
              {/* GitHub logosu: `text-white` ACIK temada beyaz kalıyordu ve mavi
              zemin üstünde zor okunuyordu. `text-primary-fg` tema ile birlikte
              çözülüyor: açık temada siyah, koyu temada beyaz — buton yazısıyla
              birebir aynı renk. */}
              <GithubIcon size={14} className="shrink-0 text-primary-fg" />
              {content.github.title}
            </a>
          </div>
          {/* BOLUM BOSLUGU (2026-10-06): GitHub butonu ile arama kutusu
              arasinda mb-8 (32px) vardi; --section-gap ile esitlendi. */}
          <div aria-hidden className="h-[var(--section-gap)]" />

          <ProjectsGrid
            projects={content.projects.items}
            githubUsername={content.settings.githubUsername}
            /* 2026-10-07 (kullanıcı): "Projeler sayfasında daha fazlasını
                 göster olmasın, direkt hepsi gözüksün; o olay ana sayfada
                 olsun." → Bu sayfada sayfalama KAPALI, tüm kartlar baştan. */
            paginate={false}
          />
        </Section>
      </main>
    </div>
  )
}
