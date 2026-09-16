import type { SiteContent } from '@/lib/content'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** Deutsch — overlay over the Turkish base (data/content.json). */
export const deContentOverlay: DeepPartial<SiteContent> = {
  hero: {
    name: 'TARIK ELER',
    tagline: 'Entwickler & Systemarchitekt',
    badge: '',
    description:
      'Ich baue moderne Web-Erlebnisse mit Next.js, TypeScript und KI. Von Design bis Deployment – alles aus einer Hand.',
    exploreLabel: 'Projekte entdecken',
    connectLabel: 'Kontakt aufnehmen',
    emoji: '🚀',
    stats: [
      { label: 'Projekte', value: '10+' },
      { label: 'Technologien', value: '15+' },
      { label: 'Fokus', value: '100%' },
    ],
  },
  nav: {
    ctaLabel: 'GitHub',
    items: [
      { title: 'Projekte', href: '/projects' },
      { title: 'Blog', href: '/blog' },
      { title: 'Chat', href: '/chat' },
      { title: 'Kontakt', href: '/#contact' },
    ],
  },
  about: {
    subtitle: 'ÜBER MICH',
    title: 'Ein Blick in Meine Welt',
    description: '',
    whoTitle: 'Wer bin ich?',
    whoText:
      'Webentwickler, der es liebt, Code zu schreiben und Produkte zu erschaffen. Webentwicklung, Design und Technologie sind meine Leidenschaft.',
    toolboxTitle: 'Mein Werkzeugkasten',
    toolboxDescription: 'Technologien, die ich beim Bauen von Projekten und Websites nutze.',
    beyondTitle: 'Jenseits des Codes',
    beyondDescription:
      'Entdecke, was ich tue, wenn ich nicht programmiere: meine Interessen und Hobbys.',
    securityTitle: 'Cybersicherheit & CTF',
    securityText:
      'Leidenschaftlich interessiert an Cybersicherheit. Ich liebe es, neue Techniken zu lernen und Sicherheits-Herausforderungen zu meistern.',
    teamTitle: 'UNSER TEAM',
    team: [
      { name: 'TARIKELER', role: 'Gründer' },
      { name: 'tarikelertarnak', role: 'Infrastruktur' },
      { name: 'Fruity Dev', role: 'DevOps' },
      { name: 'PixelShield', role: 'Sicherheit' },
      { name: 'Mythora.de', role: 'Betrieb' },
    ],
    cv: {
      summary:
        'Webentwickler, der mit Next.js, TypeScript und KI moderne, ganzheitliche Web-Erlebnisse erschafft. Vom Design bis zum Deployment: Ich baue Produkte, die Menschen nutzen.',
      experience: [
        {
          role: 'Gründer & Full-Stack-Entwickler',
          company: 'Fruity Dev',
          period: 'Aktuell',
          description:
            'Professionelle Webentwicklungs-Dienste: skalierbare, hochwertige Webanwendungen für Kunden.',
        },
        {
          role: 'Inhaber & Entwickler',
          company: 'Mythora.de',
          period: 'Aktuell',
          description:
            'Ein deutsches Minecraft-SMP-Netzwerk, komplett von mir entwickelt: Es hostet Spieler aus aller Welt.',
        },
        {
          role: 'Entwickler',
          company: 'PixelShield',
          period: 'Aktuell',
          description:
            'DDoS-Schutz für Minecraft-Server: protokollbasiertes Filtern für Java, Bedrock und Geyser.',
        },
        {
          role: 'Entwickler',
          company: 'Portfolio & GitHub-Projekte',
          period: 'Aktuell',
          description:
            'Browser-Erweiterungen, KI-Tools und nützliche Anwendungen auf GitHub veröffentlicht (Scribd-Download, AI-Jailbreak, Accentra, CodeHub u. a.).',
        },
      ],
      education: [
        {
          role: 'Autodidaktischer Entwickler',
          company: 'Informatik & Softwareentwicklung',
          period: 'Fortlaufend',
          description:
            'Praxisnahes Lernen durch Webentwicklung, Cybersicherheit, CTFs und Bug-Bounty-Plattformen.',
        },
      ],
    },
  },
  projects: {
    subtitle: 'PROJEKTE',
    title: 'Alle Projekte',
    description: '',
  },
  github: {
    subtitle: 'GITHUB',
    title: 'GitHub-Projekte',
    description: 'Meine öffentlichen Repositories, live von meinem GitHub-Profil geladen.',
  },
  chat: {
    subtitle: 'CHAT',
    title: 'Chatte mit mir',
    description: 'Hinterlasse eine Nachricht oder sag einfach Hallo. Sie erscheint sofort.',
  },
  profile: {
    firstName: 'TARIK',
    lastName: 'ELER',
    displayName: 'TARIKELER',
    nickname: 'Tarnak',
    title: 'Entwickler & Systemarchitekt',
    experience: '3+ Jahre',
    firstLanguage: 'Türkisch',
    otherLanguages: 'Englisch (B1)',
  },
  contact: {
    subtitle: 'KONTAKT',
    title: 'Kontakt',
    description: '',
    footerText: '',
    successTitle: 'Nachricht gesendet!',
    successText:
      'Danke für deine Nachricht! Ich habe sie erhalten und melde mich so schnell wie möglich.',
  },
  settings: {
    githubUsername: 'tarikelertarnak',
    defaultTheme: 'system',
    backgroundImage: '',
  },
  footer: {
    copyright: 'TARIKELER',
  },
}