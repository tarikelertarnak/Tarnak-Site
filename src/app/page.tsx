import { BlogSection } from '@/components/sections/blog-section'
import { Footer } from '@/components/footer'
import { Navigation } from '@/components/navigation'
import { AboutSection } from '@/components/sections/about-section'
import { ContactSection } from '@/components/sections/contact-section'
import { HeroSection } from '@/components/sections/hero-section'
import { ProjectsSection } from '@/components/sections/projects-section'
import { PuckPageView } from '@/components/puck/puck-page-view'
import { getPosts } from '@/lib/blog'
import { getLocale, getLocalizedContent } from '@/lib/i18n-server'
import { getPuckPage } from '@/lib/puck/store'

/**
 * Rebuild the page every 5 minutes. revalidatePath() is used for
 * instant updates when content is edited from the admin panel.
 */
export const revalidate = 300

export default async function Page() {
  const locale = await getLocale()
  const content = await getLocalizedContent()

  // If published data exists in the Page Editor, the home page is rendered from Puck.
  const puckData = await getPuckPage('home')
  if (puckData) {
    return (
      <div className="min-h-screen w-full relative">
        <Navigation content={content} />
        <PuckPageView data={puckData as Record<string, unknown>} />
        <Footer content={content} />
      </div>
    )
  }

  const posts = await getPosts(locale)

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="w-full">
        <HeroSection content={content} />
        <AboutSection content={content} />
        <ProjectsSection
          content={content}
          githubUsername={content.settings.githubUsername}
        />
        <BlogSection posts={posts} />
        <ContactSection content={content} />
      </main>
      <Footer content={content} />
    </div>
  )
}