import type { SiteContent } from '@/lib/content'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/**
 * English content translations.
 *
 * data/content.json is the Turkish single source of truth; when the locale is
 * 'en' this overlay is applied over the text fields. Names, URLs, icons,
 * images, and data-driven arrays (toolbox/social etc.) are preserved.
 */
export const enContentOverlay: DeepPartial<SiteContent> = {
  hero: {
    name: 'TARIK ELER',
    tagline: 'Developer & Systems Architecture',
    badge: '',
    description:
      'Building modern web experiences with Next.js, TypeScript and AI. I work end-to-end, from design to deployment.',
    exploreLabel: 'Explore Projects',
    connectLabel: 'Get in Touch',
    emoji: '🚀',
    stats: [
      { label: 'Projects', value: '10+' },
      { label: 'Technologies', value: '15+' },
      { label: 'Focus', value: '100%' },
    ],
  },
  nav: {
    ctaLabel: 'GitHub',
    githubRepo: 'https://github.com/TARIKELER-TARNAK',
    items: [
      { title: 'Projects', href: '/projects' },
      { title: 'Blog', href: '/blog' },
      { title: 'Chat', href: '/chat' },
      { title: 'Contact', href: '/#contact' },
    ],
  },
  about: {
    subtitle: 'ABOUT ME',
    title: 'A Quick Look Into My World',
    description: '',
    whoTitle: 'Who Am I?',
    whoText:
      'A web developer who enjoys writing code and building products. Web development, design and technology are my passion.',
    toolboxTitle: 'My Toolbox',
    toolboxDescription: 'Technologies I use while building projects and sites.',
    beyondTitle: 'Beyond Code',
    beyondDescription:
      'Discover what I do when I am not coding, my interests and hobbies.',
    securityTitle: 'Cybersecurity & CTF',
    securityText:
      'Passionate about cybersecurity. I love learning new techniques and overcoming security challenges.',
    teamTitle: 'OUR TEAM',
    team: [
      { name: 'TARIKELER', role: 'Founder' },
      { name: 'TARIKELER-TARNAK', role: 'Infrastructure' },
      { name: 'Fruity Dev', role: 'DevOps' },
      { name: 'PixelShield', role: 'Security' },
      { name: 'Mythora.de', role: 'Operations' },
    ],
    cv: {
      summary:
        'Web developer building modern, end-to-end web experiences with Next.js, TypeScript and AI. From design to deployment — I build products people use.',
      experience: [
        {
          role: 'Founder & Full-Stack Developer',
          company: 'Fruity Dev',
          period: 'Ongoing',
          description:
            'Professional web development services — high-quality, scalable web applications for clients.',
        },
        {
          role: 'Owner & Developer',
          company: 'Mythora.de',
          period: 'Ongoing',
          description:
            'A fully self-developed German Minecraft SMP network — hosting players from all over the world.',
        },
        {
          role: 'Developer',
          company: 'PixelShield',
          period: 'Ongoing',
          description:
            'DDoS protection for Minecraft servers — protocol-focused filtering for Java, Bedrock and Geyser.',
        },
        {
          role: 'Developer',
          company: 'Portfolio & GitHub Projects',
          period: 'Ongoing',
          description:
            'Browser extensions, AI tools and utility apps published on GitHub (Scribd-Download, AI-Jailbreak, Accentra, CodeHub and more).',
        },
      ],
      education: [
        {
          role: 'Self-Taught Developer',
          company: 'Computer Science & Software Engineering',
          period: 'Continuous',
          description:
            'Hands-on learning through web development, cybersecurity, CTF and bug bounty platforms.',
        },
      ],
    },
  },
  projects: {
    subtitle: 'PROJECTS',
    title: 'All Projects',
    description: '',
    items: [
      {
        title: 'Player',
        notice: '[Featured]',
        description:
          'Music player app — queue-based playlist, search, volume control.',
        projectLink: 'https://github.com/TARIKELER-TARNAK/Player',
        srcLink: 'https://github.com/TARIKELER-TARNAK/Player',
        image: '',
      },
      {
        title: 'Media Player Test',
        description:
          'Multi-media player test with GIF and video — temporary demo project for the media player.',
        projectLink: '/',
        image: '/demo/test-computer.gif',
        media: ['/demo/test-computer.gif', '/demo/big-buck-bunny.mp4'],
        updatedAt: '2026-09-08T23:15:01.276Z',
        tags: ['media', 'test'],
      },
    ],
  },
  github: {
    subtitle: 'GITHUB',
    title: 'GitHub Projects',
    description: 'My public repositories, fetched live from my GitHub profile.',
  },
  chat: {
    subtitle: 'CHAT',
    title: 'Chat With Me',
    description: 'Leave a message or just say hello. It will show up instantly.',
  },
  profile: {
    firstName: 'TARIK',
    lastName: 'ELER',
    displayName: 'TARIKELER',
    nickname: 'Tarnak',
    title: 'Developer & Systems Architecture',
    profileImage: 'https://avatars.githubusercontent.com/u/184168415?v=4',
    experience: '3+ Years',
    firstLanguage: 'Turkish',
    otherLanguages: 'English (B1)',
  },
  contact: {
    subtitle: 'CONTACT',
    title: 'Contact',
    description: '',
    footerText: '',
    successTitle: 'Message sent!',
    successText:
      'Thanks for reaching out! I received your message and will get back to you as soon as possible.',
    email: 'tarikelertarnak@gmail.com',
    phone: '+90 5518957215',
    location:
      'https://www.google.com/maps/place/Fetih,+S%C3%B6nmez+Sk.+No:5,+42030+Karatay%2FKonya/@37.8750305,32.5391801,17z/data=!4m6!3m5!1s0x14d09ab31a659e3d:0x594d704ce1aa1698!8m2!3d37.8750305!4d32.5391801!16s%2Fg%2F11c4h6twdh?entry=ttu&g_ep=EgoyMDI2MDkwMi4wIKXMDSoASAFQAw%3D%3D',
    locationYandex:
      'https://yandex.com.tr/maps/101474/konya/?ll=32.539234%2C37.875019&mode=whatshere&utm_source=share&whatshere%5Bpoint%5D=32.539225%2C37.875038&whatshere%5Bzoom%5D=17&z=21',
  },
  settings: {
    githubUsername: 'TARIKELER-TARNAK',
    defaultTheme: 'system',
    backgroundImage: '',
  },
  footer: {
    copyright: 'TARIKELER',
  },
}
