import { AboutPageView } from '@/components/about/about-page-view'
import { Navigation } from '@/components/navigation'
import {
  CertificatesSection,
  TimelineSection,
} from '@/components/phase6-sections'
import { Section } from '@/components/ui/section'
import { paragraphs, parseAboutPage, pickLocalized } from '@/lib/about-page'
import { getContent, getContentSourceStatus } from '@/lib/content'
import { getStaticLocalizedContent } from '@/lib/i18n-server'
import { parsePhase6 } from '@/lib/phase6'

/**
 * `/about` sayfası (2026-10-17).
 *
 * Biyografi artık kaynak kodda DEĞİL: `site_content.content->'aboutPage'`
 * alanından okunur, admin panelinden (Profil & Hakkımda → Hakkımda Sayfası)
 * düzenlenir. Şema: `src/lib/about-page.ts`, seed: `supabase/about-page.sql`.
 *
 * Bu dosyada eskiden `TIMELINE` / `FOCUS` / `VALUES` sabitleri vardı; içinde
 * onaylanmamış tarihler (2019-2024+) ve uydurma iddialar (CTF, bug bounty,
 * pentest, "Sistem Mimarı") bulunuyordu. Hepsi KALDIRILDI ve yerine yedek
 * metin KONULMADI — içerik yoksa sayfa yerelleştirilmiş boş durum gösterir.
 *
 * 2026-10-03: ISR kaldırıldı — `force-static` kalır (Workers Free 10 ms CPU).
 * Dil istemcide çözülür (`AboutPageView` → `useLocale()`), bu yüzden sayfayı
 * dinamik yapmaya gerek yok.
 */
export const dynamic = 'force-static'

export async function generateMetadata() {
  /*
   * Açıklama İÇERİKTEN türetilir (uydurma unvan yazılmaz): giriş metninin
   * ilk paragrafı. İçerik yoksa yalnızca ad/marka yazılır.
   */
  const content = await getContent()
  const aboutPage = parseAboutPage(content.aboutPage)
  const ilkParagraf = paragraphs(pickLocalized(aboutPage?.intro, 'tr'))[0] ?? ''
  const aciklama
    = ilkParagraf.length > 0
      ? ilkParagraf.slice(0, 180)
      : 'TARIK ELER (TARNAK) — kişisel site: projeler, yazılar ve iletişim.'
  const baslik = pickLocalized(aboutPage?.title, 'tr') || 'HAKKIMDA'

  return {
    title: `${baslik} — TARIK ELER - TARNAK`,
    description: aciklama,
    alternates: { canonical: '/about' },
    openGraph: {
      title: `${baslik} — TARIK ELER - TARNAK`,
      description: aciklama,
      url: '/about',
      type: 'profile',
    },
  }
}

export default async function AboutPage() {
  const content = await getStaticLocalizedContent()
  const aboutPage = parseAboutPage(content.aboutPage)
  // "Kayıt yok" ile "okuma başarısız" ayrı gösterilir (bkz. getContentSourceStatus).
  const readFailed = getContentSourceStatus().supabase === 'error'

  /*
   * GitHub adresi AYARLARDAN gelir (admin: Site Ayarları → GitHub repo /
   * sosyal medya). Bileşende sabitlenmez; ayar boşsa bilinen profil
   * adresine düşülür.
   */
  const sosyalGithub = content.social.find(
    s => s?.href?.includes('github.com') || s?.name?.toLowerCase() === 'github',
  )?.href
  const githubUrl
    = content.nav.githubRepo || sosyalGithub || 'https://github.com/tarikelertarnak'

  // Ek bölümler (zaman çizelgesi + sertifikalar) — içerik yoksa render EDİLMEZ.
  const phase6 = parsePhase6(
    (content as unknown as Record<string, unknown>).phase6,
  )
  const timelineItems = phase6?.timeline?.items.filter(i => i.title) ?? []
  const certificateItems = phase6?.certificates?.items.filter(i => i.name) ?? []

  return (
    <div className="relative min-h-screen w-full">
      <Navigation />
      <AboutPageView
        aboutPage={aboutPage}
        readFailed={readFailed}
        githubUrl={githubUrl}
      />

      {timelineItems.length > 0 && (
        <>
          <div aria-hidden className="h-[var(--section-gap)]" />
          <Section className="flex-col pb-0">
            <TimelineSection
              title={phase6?.timeline?.title}
              items={timelineItems}
            />
          </Section>
        </>
      )}

      {certificateItems.length > 0 && (
        <>
          <div aria-hidden className="h-[var(--section-gap)]" />
          <Section className="flex-col pb-0">
            <CertificatesSection
              title={phase6?.certificates?.title}
              items={certificateItems}
            />
          </Section>
        </>
      )}
    </div>
  )
}
