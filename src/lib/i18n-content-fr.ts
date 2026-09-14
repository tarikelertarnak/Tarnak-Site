import type { SiteContent } from '@/lib/content'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** Français — overlay over the Turkish base (data/content.json). */
export const frContentOverlay: DeepPartial<SiteContent> = {
  hero: {
    name: 'TARIK ELER',
    tagline: 'Développeur & Architecte Système',
    badge: '',
    description:
      'Je construis des expériences web modernes avec Next.js, TypeScript et l’IA. De l’idée au déploiement, je mène tout de bout en bout.',
    exploreLabel: 'Explorer les projets',
    connectLabel: 'Me contacter',
    emoji: '🚀',
    stats: [
      { label: 'Projets', value: '10+' },
      { label: 'Technologies', value: '15+' },
      { label: 'Focus', value: '100%' },
    ],
  },
  nav: {
    ctaLabel: 'GitHub',
    items: [
      { title: 'Projets', href: '/projects' },
      { title: 'Blog', href: '/blog' },
      { title: 'Chat', href: '/chat' },
      { title: 'Contact', href: '/#contact' },
    ],
  },
  about: {
    subtitle: 'À PROPOS',
    title: 'Un Regard sur Mon Monde',
    description: '',
    whoTitle: 'Qui suis-je ?',
    whoText:
      'Développeur web qui aime écrire du code et créer des produits. Le web, le design et la technologie sont ma passion.',
    toolboxTitle: 'Ma Boîte à Outils',
    toolboxDescription: 'Les technologies que j’utilise pour créer des projets et des sites.',
    beyondTitle: 'Au-delà du Code',
    beyondDescription:
      'Découvrez ce que je fais quand je ne code pas : mes intérêts et mes hobbies.',
    securityTitle: 'Cybersécurité & CTF',
    securityText:
      'Passionné de cybersécurité. J’adore apprendre de nouvelles techniques et relever des défis de sécurité.',
    teamTitle: 'NOTRE ÉQUIPE',
    team: [
      { name: 'TARIKELER', role: 'Fondateur' },
      { name: 'TARIKELER-TARNAK', role: 'Infrastructure' },
      { name: 'Fruity Dev', role: 'DevOps' },
      { name: 'PixelShield', role: 'Sécurité' },
      { name: 'Mythora.de', role: 'Opérations' },
    ],
    cv: {
      summary:
        'Développeur web qui crée des expériences web modernes et complètes avec Next.js, TypeScript et l’IA. Du design au déploiement : je construis des produits que les gens utilisent.',
      experience: [
        {
          role: 'Fondateur & Développeur Full-Stack',
          company: 'Fruity Dev',
          period: 'Actuel',
          description:
            'Services de développement web professionnels : des applications web évolutives et de haute qualité pour les clients.',
        },
        {
          role: 'Propriétaire & Développeur',
          company: 'Mythora.de',
          period: 'Actuel',
          description:
            'Un réseau SMP Minecraft allemand entièrement développé par moi : il héberge des joueurs du monde entier.',
        },
        {
          role: 'Développeur',
          company: 'PixelShield',
          period: 'Actuel',
          description:
            'Protection DDoS pour les serveurs Minecraft : filtrage orienté protocole pour Java, Bedrock et Geyser.',
        },
        {
          role: 'Développeur',
          company: 'Portfolio & Projets GitHub',
          period: 'Actuel',
          description:
            'Extensions de navigateur, outils IA et applications utilitaires publiés sur GitHub (Scribd-Download, AI-Jailbreak, Accentra, CodeHub, etc.).',
        },
      ],
      education: [
        {
          role: 'Développeur Autodidacte',
          company: 'Informatique & Génie Logiciel',
          period: 'En continu',
          description:
            'Apprentissage pratique grâce au développement web, à la cybersécurité, aux CTF et aux plateformes de bug bounty.',
        },
      ],
    },
  },
  projects: {
    subtitle: 'PROJETS',
    title: 'Tous les Projets',
    description: '',
  },
  github: {
    subtitle: 'GITHUB',
    title: 'Projets GitHub',
    description: 'Mes dépôts publics, chargés en direct depuis mon profil GitHub.',
  },
  chat: {
    subtitle: 'CHAT',
    title: 'Discute avec moi',
    description: 'Laisse un message ou dis simplement bonjour. Il apparaîtra instantanément.',
  },
  profile: {
    firstName: 'TARIK',
    lastName: 'ELER',
    displayName: 'TARIKELER',
    nickname: 'Tarnak',
    title: 'Développeur & Architecte Système',
    experience: '3+ ans',
    firstLanguage: 'Turc',
    otherLanguages: 'Anglais (B1)',
  },
  contact: {
    subtitle: 'CONTACT',
    title: 'Contact',
    description: '',
    footerText: '',
    successTitle: 'Message envoyé !',
    successText:
      'Merci pour votre message ! Je l’ai bien reçu et je vous répondrai dès que possible.',
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