import type { SiteContent } from '@/lib/content'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/**
 * Turkish content translations.
 *
 * The content.json + Supabase combination is English; when locale is 'tr' this
 * overlay is applied over the text fields. Names, URLs, icons, images,
 * and data-driven arrays (toolbox/social etc.) are preserved.
 */
export const trContentOverlay: DeepPartial<SiteContent> = {
  hero: {
    name: 'TARIK ELER',
    tagline: 'Yazılımcı & Sistem Mimarisi',
    badge: '',
    description:
      'Next.js, TypeScript ve yapay zeka ile modern web deneyimleri üretiyorum. Tasarımdan deploy\u2019a kadar uçtan uca çalışırım.',
    exploreLabel: 'Projeleri Keşfet',
    connectLabel: 'İletişime Geç',
    emoji: '🚀',
  },
  nav: {
    ctaLabel: 'GitHub',
    githubRepo: 'https://github.com/TARIKELER-TARNAK',
    items: [
      { title: 'Projeler', href: '/projects' },
      { title: 'Blog', href: '/blog' },
      { title: 'Sohbet', href: '/chat' },
      { title: 'İletişim', href: '/#contact' },
    ],
  },
  about: {
    subtitle: 'HAKKIMDA',
    title: 'Dünyama Kısa Bir Bakış',
    description: '',
    whoTitle: 'Ben Kimim?',
    whoText:
      'Kod yazmayı ve ürün geliştirmeyi seven bir web geliştiriciyim. Web geliştirme, tasarım ve teknoloji benim için bir tutku.',
    toolboxTitle: 'Araç Çantam',
    toolboxDescription: 'Projeler ve siteler geliştirirken kullandığım teknolojiler.',
    beyondTitle: 'Kodun Ötesinde',
    beyondDescription:
      'Kod yazmadığım zamanlarda neler yaptığımı, ilgi alanlarımı ve hobilerimi keşfet.',
    interests: [
      {
        label: 'Donanım',
        icon: 'mdi:laptop',
        content: 'Bilgisayarlar ve diğer teknolojilerle uğraşmayı seviyorum.',
      },
      {
        label: 'Oyun',
        icon: 'mdi:gamepad-variant',
        content: 'Video oyunları oynamayı, özellikle arkadaşlarımla oynamayı severim.',
      },
      {
        label: 'Spor',
        icon: 'mdi:gym',
        content: 'Düzenli olarak spora gidip aktif kalmayı seviyorum.',
      },
      {
        label: 'Müzik',
        icon: 'mdi:music',
        content:
          "Müziğin büyük bir hayranıyım; yeni sanatçılar ve türler keşfetmeyi severim.",
      },
      {
        label: 'Siber Güvenlik',
        icon: 'mdi:shield-lock',
        content:
          'Pentest, CTF yarışmaları ve bug bounty platformlarında zafiyet avlamayı seviyorum.',
      },
    ],
    securityTitle: 'Siber Güvenlik & CTF',
    securityText:
      'Siber güvenliğe tutkulu biriyim. Yeni teknikler öğrenmeyi ve güvenlik zorluklarının üstesinden gelmeyi seviyorum.',
    teamTitle: 'EKİBİMİZ',
    cv: {
      summary:
        'Next.js, TypeScript ve yapay zeka ile modern, uçtan uca web deneyimleri üreten web geliştirici. Tasarımdan deploy\u2019a — insanların kullandığı ürünler geliştiriyorum.',
      experience: [
        {
          role: 'Geliştirici',
          company: 'Portfolyo & GitHub Projeleri',
          period: 'Devam ediyor',
          description:
            'GitHub\u2019da yayınlanan tarayıcı eklentileri, AI araçları ve yardımcı uygulamalar (Scribd-Download, AI-Jailbreak, Accentra, CodeHub ve daha fazlası).',
        },
      ],
      education: [
        {
          role: 'Kendi Kendini Yetiştiren Geliştirici',
          company: 'Bilgisayar Bilimi & Yazılım Mühendisliği',
          period: 'Sürekli',
          description:
            'Web geliştirme, siber güvenlik, CTF ve bug bounty platformları üzerinde uygulamalı öğrenme.',
        },
      ],
    },
  },
  projects: {
    subtitle: 'PROJELER',
    title: 'Tüm Projeler',
    description: '',
  },
  github: {
    subtitle: 'GITHUB',
    title: 'GitHub Projeleri',
    description: 'GitHub profilimden canlı çekilen genel depolarım.',
  },
  chat: {
    subtitle: 'SOHBET',
    title: 'Benimle Sohbet Et',
    description: 'Bir mesaj bırakın ya da merhaba deyin. Anında görünür.',
  },
  profile: {
    firstName: 'TARIK',
    lastName: 'ELER',
    displayName: 'TARIKELER',
    nickname: 'Tarnak',
    title: 'Yazılımcı & Sistem Mimarisi',
    profileImage: 'https://avatars.githubusercontent.com/u/184168415?v=4',
    experience: '3+ Yıl',
    firstLanguage: 'Türkçe',
    otherLanguages: 'İngilizce (B1)',
  },
  contact: {
    subtitle: 'İLETİŞİM',
    title: 'İletişim',
    description: '',
    footerText: '',
    successTitle: 'Mesajın iletildi!',
    successText:
      'Bana ulaştığın için teşekkürler! Mesajını aldım, en kısa sürede sana döneceğim.',
  },
  footer: {
    copyright: 'TARIKELER',
  },
}
