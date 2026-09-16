import { Navigation } from '@/components/navigation'
import { BriefcaseIcon, CodeIcon, GithubIcon, HeartIcon, ShieldIcon, socialIcon, StarIcon, UserIcon } from '@/components/ui/icons'
import { Section } from '@/components/ui/section'
import { getLocale, getLocalizedContent } from '@/lib/i18n-server'

export async function generateMetadata() {
  const locale = await getLocale()
  const isEn = locale === 'en'
  return {
    title: isEn ? 'About — TARIK ELER - TARNAK' : 'Hakkımda — TARIK ELER - TARNAK',
    description: isEn
      ? 'TARIK ELER (Tarnak) — Web developer & creator. I build projects with Next.js, TypeScript and AI. My history, skills and motivation.'
      : 'TARIK ELER (Tarnak) — Web developer & creator. Next.js, TypeScript ve yapay zeka üzerine projeler geliştiriyorum. Geçmişim, yeteneklerim ve motivasyonum.',
  }
}

const TIMELINE = [
  {
    year: '2019',
    title: 'İlk adımlar',
    body: 'HTML, CSS ve JavaScript ile basit web sayfaları yazarak başladım. Statik siteler ve küçük JavaScript oyunları ilk projelerimdi.',
    icon: CodeIcon,
  },
  {
    year: '2020',
    title: 'Framework keşfi',
    body: 'React ve Node.js öğrendim. Kişisel projeler için SPA mimarisi, REST API ve JWT auth kavramlarını deneyimledim.',
    icon: BriefcaseIcon,
  },
  {
    year: '2021',
    title: 'TypeScript & Next.js',
    body: 'TypeScript ile tip güvenli kod yazımına geçtim. Next.js ile SEO-dostu, hızlı, full-stack uygulamalar geliştirmeye başladım.',
    icon: StarIcon,
  },
  {
    year: '2022',
    title: 'Açık kaynak & ilk yayınlar',
    body: 'GitHub\'da açık kaynak projeler yayınladım. Topluluk katkıları ve issue tracker üzerinden geri bildirim alarak büyüdüm.',
    icon: GithubIcon,
  },
  {
    year: '2023',
    title: 'Yapay zeka & modern stack',
    body: 'OpenAI API, LLM entegrasyonları ve AI destekli uygulamalar geliştirdim. Supabase, Tailwind v4, HeroUI ile modern stack\'e geçtim.',
    icon: HeartIcon,
  },
  {
    year: '2024+',
    title: 'Siber güvenlik & sürekli öğrenme',
    body: 'CTF yarışmaları ve bug bounty programlarına katılıyorum. Pentest araçları yazıyor, güvenlik odaklı projeler geliştiriyorum.',
    icon: ShieldIcon,
  },
]

const TIMELINE_EN: typeof TIMELINE = [
  {
    year: '2019',
    title: 'First steps',
    body: 'I started by writing simple web pages with HTML, CSS and JavaScript. Static sites and small JavaScript games were my first projects.',
    icon: CodeIcon,
  },
  {
    year: '2020',
    title: 'Framework discovery',
    body: 'I learned React and Node.js. I experimented with SPA architecture, REST APIs and JWT auth for personal projects.',
    icon: BriefcaseIcon,
  },
  {
    year: '2021',
    title: 'TypeScript & Next.js',
    body: 'I switched to type-safe code with TypeScript. I started building fast, SEO-friendly full-stack apps with Next.js.',
    icon: StarIcon,
  },
  {
    year: '2022',
    title: 'Open source & first releases',
    body: 'I published open source projects on GitHub. I grew through community contributions and feedback via issue trackers.',
    icon: GithubIcon,
  },
  {
    year: '2023',
    title: 'AI & modern stack',
    body: 'I built OpenAI API and LLM integrations, and AI-powered apps. I moved to a modern stack with Supabase, Tailwind v4 and HeroUI.',
    icon: HeartIcon,
  },
  {
    year: '2024+',
    title: 'Cybersecurity & continuous learning',
    body: 'I participate in CTF competitions and bug bounty programs. I write pentest tools and develop security-focused projects.',
    icon: ShieldIcon,
  },
]

const FOCUS = [
  {
    title: 'Modern Web',
    body: 'Next.js, TypeScript, React 19 ve modern build araçlarıyla production-ready uygulamalar.',
  },
  {
    title: 'Yapay Zeka',
    body: 'LLM entegrasyonları, prompt engineering, AI destekli editörler ve otomasyon araçları.',
  },
  {
    title: 'Açık Kaynak',
    body: 'GitHub üzerinden paylaştığım projeler — script executor, AI jailbreak, code editor ve daha fazlası.',
  },
  {
    title: 'Siber Güvenlik',
    body: 'Pentest, CTF, bug bounty. Zafiyet analizi ve güvenli yazılım geliştirme pratikleri.',
  },
]

const FOCUS_EN: typeof FOCUS = [
  {
    title: 'Modern Web',
    body: 'Production-ready apps with Next.js, TypeScript, React 19 and modern build tools.',
  },
  {
    title: 'Artificial Intelligence',
    body: 'LLM integrations, prompt engineering, AI-powered editors and automation tools.',
  },
  {
    title: 'Open Source',
    body: 'Projects I share on GitHub — script executor, AI jailbreak, code editor and more.',
  },
  {
    title: 'Cybersecurity',
    body: 'Pentest, CTF, bug bounty. Vulnerability analysis and secure software development practices.',
  },
]

const VALUES = [
  { label: 'Sürekli öğrenme', desc: 'Teknoloji durmadan değişiyor, ben de.' },
  { label: 'Sade çözümler', desc: 'Laziness as a feature — az kod, çok iş.' },
  { label: 'Açık kaynak', desc: 'Bildiklerimi paylaşır, başkalarından öğrenirim.' },
  { label: 'Güvenlik odaklı', desc: 'Yazdığım her şeyin güvenli olduğundan emin olurum.' },
  { label: 'Hız', desc: 'Düşünce → ürün arasındaki süreyi minimuma indiririm.' },
  { label: 'Tutarlılık', desc: 'Detaylara önem veririm; UI/UX bütünü bir hikaye anlatır.' },
]

const VALUES_EN: typeof VALUES = [
  { label: 'Continuous learning', desc: 'Technology keeps changing, and so do I.' },
  { label: 'Simple solutions', desc: 'Laziness as a feature — less code, more work done.' },
  { label: 'Open source', desc: 'I share what I know and learn from others.' },
  { label: 'Security first', desc: 'I make sure everything I write is secure.' },
]

export default async function AboutPage() {
  const content = await getLocalizedContent()
  const locale = await getLocale()
  const isEn = locale === 'en'
  const { about } = content
  const profile = content.profile
  const timeline = isEn ? TIMELINE_EN : TIMELINE
  const focus = isEn ? FOCUS_EN : FOCUS
  const values = isEn ? VALUES_EN : VALUES

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="w-full">
        {/* Hero */}
        <Section
          className="flex-col pt-28 sm:pt-32 pb-12 sm:pb-16"
          id="about"
        >
          <div className="mx-auto w-full max-w-3xl text-center">
            <h1 className="inline-flex items-center gap-4 border-b-4 border-primary pb-3 text-3xl font-black uppercase tracking-tight text-primary sm:text-4xl lg:text-5xl">
              <UserIcon size={36} className="inline-block" />
              {about.subtitle}
            </h1>
            {/* Social links */}
            <div className="mt-8 flex flex-row flex-wrap items-center justify-center gap-3">
              {content.social.map(item => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.name}
                  title={item.name}
                  className="group flex h-11 w-11 items-center justify-center rounded-xl border border-foreground-200/10 bg-background text-foreground-500 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  {socialIcon(item.icon, 22)}
                </a>
              ))}
            </div>
            {about.description && (
              <p className="mt-4 text-base text-foreground/60 sm:text-lg">
                {about.description}
              </p>
            )}
          </div>
        </Section>

        {/* About me description */}
        <Section className="flex-col pb-12 sm:pb-16" framed>
          <div className="mx-auto w-full max-w-3xl">
            <div className="rounded-2xl border border-foreground-200/10 bg-background p-6 sm:p-8">
              <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
                {isEn ? 'Hello, I\'m Tarık.' : 'Merhaba, ben Tarık.'}
              </h2>
              <div className="space-y-4 text-sm leading-relaxed text-foreground/75 sm:text-base">
                <p>
                  {isEn
                    ? (
                        <>
                          {profile.title}
                          . I build projects with Next.js, TypeScript
                          and AI — end to end, from design to deploy. Writing code
                          isn't just a job to me; it's the most enjoyable way to
                          solve problems.
                        </>
                      )
                    : (
                        <>
                          {profile.title}
                          . Next.js, TypeScript ve yapay zeka üzerine
                          projeler geliştiriyorum — tasarımdan deploy'a kadar uçtan
                          uca. Kod yazmak benim için sadece bir iş değil, problem
                          çözmenin en keyifli hali.
                        </>
                      )}
                </p>
                <p>
                  {about.whoText}
                </p>
                <p>
                  {isEn
                    ? (
                        <>
                          I publish open source projects, take part in
                          {' '}
                          <span className="text-primary">cybersecurity</span>
                          {' '}
                          communities and keep learning new things. I use TARNAK (my
                          own brand) to produce content and contribute to the
                          developer community.
                        </>
                      )
                    : (
                        <>
                          Açık kaynak projeler yayınlıyor,
                          {' '}
                          <span className="text-primary">siber güvenlik</span>
                          {' '}
                          topluluklarında yer alıyor ve sürekli yeni şeyler
                          öğreniyorum. TARNAK'ı (kendi markamı) özellikle Türkçe
                          içerik üretmek ve Türk geliştirici topluluğuna katkıda
                          bulunmak için kullanıyorum.
                        </>
                      )}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Focus areas */}
        <Section className="flex-col pb-12 sm:pb-16">
          <div className="mx-auto w-full max-w-5xl">
            <h2 className="mb-6 text-center text-2xl font-bold text-foreground sm:text-3xl">
              {isEn ? 'Areas I Focus On' : 'Üzerinde Çalıştığım Alanlar'}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {focus.map(f => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-foreground-200/10 bg-background p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
                >
                  <h3 className="mb-2 text-base font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="text-sm text-foreground/60">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Timeline / Journey */}
        <Section className="flex-col pb-12 sm:pb-16" framed>
          <div className="mx-auto w-full max-w-3xl">
            <h2 className="mb-8 text-center text-2xl font-bold text-foreground sm:text-3xl">
              {isEn ? 'My Journey' : 'Yolculuğum'}
            </h2>
            <ol className="relative space-y-8 border-l-2 border-foreground-200/10 pl-6 sm:pl-8">
              {timeline.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.year} className="relative">
                    <span className="absolute -left-[34px] sm:-left-[42px] top-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-foreground-200/15 bg-background text-primary sm:-left-[42px]">
                      <Icon size={14} />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      {item.year}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/65">
                      {item.body}
                    </p>
                  </li>
                )
              })}
            </ol>
          </div>
        </Section>

        {/* Values */}
        <Section className="flex-col pb-16 sm:pb-24">
          <div className="mx-auto w-full max-w-4xl">
            <h2 className="mb-6 text-center text-2xl font-bold text-foreground sm:text-3xl">
              {isEn ? 'My Values' : 'Değerlerim'}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {values.map(v => (
                <div
                  key={v.label}
                  className="rounded-2xl border border-foreground-200/10 bg-background px-5 py-4"
                >
                  <h3 className="mb-1 text-sm font-bold text-primary">
                    {v.label}
                  </h3>
                  <p className="text-sm text-foreground/65">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* CTA */}
        <Section className="flex-col pb-24 sm:pb-32" framed>
          <div className="mx-auto w-full max-w-2xl text-center">
            <h2 className="text-2xl font-black text-foreground sm:text-3xl">
              {isEn ? 'Let\'s work together.' : 'Birlikte çalışalım.'}
            </h2>
            <p className="mt-3 text-sm text-foreground/60 sm:text-base">
              {isEn
                ? 'Have a project idea, a job offer, or just want to say hello — reach out. I am always open to feedback and questions.'
                : 'Bir proje fikrin, iş teklifi ya da sadece merhaba demek için bana ulaş. Geri bildirim ve sorulara her zaman açığım.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://github.com/tarikelertarnak"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <GithubIcon size={16} />
                {isEn ? 'Follow on GitHub' : 'GitHub\'da Takip Et'}
              </a>
              <a
                href="/#contact"
                className="inline-flex items-center gap-2 rounded-lg border border-foreground-200/15 bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {isEn ? 'Get in Touch' : 'İletişime Geç'}
              </a>
            </div>
          </div>
        </Section>
      </main>
    </div>
  )
}
