import { Footer } from '@/components/footer'
import {
  ServicesSection,
  TestimonialsSection,
} from '@/components/phase6-sections'
import { AboutSection } from '@/components/sections/about-section'
import { BlogSection } from '@/components/sections/blog-section'
import { ContactSection } from '@/components/sections/contact-section'
import { HeroSection } from '@/components/sections/hero-section'
import { ProjectsSection } from '@/components/sections/projects-section'
import { Section } from '@/components/ui/section'
import { VideosSection } from '@/components/videos-section'
import { getPosts } from '@/lib/blog'
import { getCvs } from '@/lib/cv'
import { getStaticLocale, getStaticLocalizedContent } from '@/lib/i18n-server'
import { parsePhase6 } from '@/lib/phase6'
import { kanalVideolari } from '@/lib/youtube'

/**
 * 2026-10-02 Cloudflare 1102 fix: prerender at build time and serve from the
 * Pages CDN. Without this the route stays dynamic (cookies()/headers() via
 * getLocale), every request full-SSRs a 13 MB handler, and the 10 ms Workers
 * Free CPU budget is blown -> intermittent 503.
 */
export const dynamic = 'force-static'

export default async function Page() {
  const locale = await getStaticLocale()
  const content = await getStaticLocalizedContent()
  const posts = await getPosts(locale)
  const cvs = await getCvs()
  // Ek bölümler — hizmetler + referanslar (içerik boşsa render edilmez)
  const phase6 = parsePhase6(
    (content as unknown as Record<string, unknown>).phase6,
  )
  const hizmetler = phase6?.services?.items.filter(i => i.title) ?? []
  const referanslar = phase6?.testimonials?.items.filter(i => i.quote) ?? []
  // YouTube videoları. Kanal ID boşsa veya besleme hata
  // verirse boş dizi döner ve bölüm render edilmez (kullanıcı kuralı).
  const videolar = await kanalVideolari(
    phase6?.videos?.channelId,
    phase6?.videos?.maxItems ?? 4,
  )

  return (
    <div className="min-h-screen w-full relative">
      <main id="main" className="w-full">
        <HeroSection content={content} cvs={cvs} />
        <AboutSection content={content} cvs={cvs} vcard={phase6?.vcard} />
        <ProjectsSection
          content={content}
          githubUsername={content.settings.githubUsername}
        />
        <BlogSection posts={posts} />

        {/* Ek bölümler — hizmetler + referanslar. Boşsa HİÇ render edilmez. */}
        {hizmetler.length > 0 && (
          <>
            <div aria-hidden className="h-[var(--section-gap)]" />
            <Section className="flex-col pb-0">
              <ServicesSection
                title={phase6?.services?.title}
                description={phase6?.services?.description}
                items={hizmetler}
                ctaLabel="Teklif al"
                ctaHref="/contact/"
              />
            </Section>
          </>
        )}

        {referanslar.length > 0 && (
          <>
            <div aria-hidden className="h-[var(--section-gap)]" />
            <Section className="flex-col pb-0">
              <TestimonialsSection
                title={phase6?.testimonials?.title}
                items={referanslar}
              />
            </Section>
          </>
        )}
        {videolar.length > 0 && (
          <>
            <div aria-hidden className="h-[var(--section-gap)]" />
            <Section className="flex-col pb-0">
              <VideosSection
                videolar={videolar}
                baslik={phase6?.videos?.title}
              />
            </Section>
          </>
        )}
        <ContactSection content={content} />
      </main>
      <Footer content={content} />
    </div>
  )
}
