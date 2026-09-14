import type { SiteContent } from '@/lib/content'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** Español — overlay over the Turkish base (data/content.json). */
export const esContentOverlay: DeepPartial<SiteContent> = {
  hero: {
    name: 'TARIK ELER',
    tagline: 'Desarrollador y Arquitectura de Sistemas',
    badge: '',
    description:
      'Construyo experiencias web modernas con Next.js, TypeScript e IA. Trabajo de principio a fin, del diseño al despliegue.',
    exploreLabel: 'Explorar proyectos',
    connectLabel: 'Ponte en contacto',
    emoji: '🚀',
    stats: [
      { label: 'Proyectos', value: '10+' },
      { label: 'Tecnologías', value: '15+' },
      { label: 'Enfoque', value: '100%' },
    ],
  },
  nav: {
    ctaLabel: 'GitHub',
    items: [
      { title: 'Proyectos', href: '/projects' },
      { title: 'Blog', href: '/blog' },
      { title: 'Chat', href: '/chat' },
      { title: 'Contacto', href: '/#contact' },
    ],
  },
  about: {
    subtitle: 'SOBRE MÍ',
    title: 'Un Vistazo a Mi Mundo',
    description: '',
    whoTitle: '¿Quién Soy?',
    whoText:
      'Desarrollador web al que le encanta escribir código y crear productos. El desarrollo web, el diseño y la tecnología son mi pasión.',
    toolboxTitle: 'Mi Caja de Herramientas',
    toolboxDescription: 'Tecnologías que uso al construir proyectos y sitios web.',
    beyondTitle: 'Más Allá del Código',
    beyondDescription:
      'Descubre lo que hago cuando no programo: mis intereses y aficiones.',
    securityTitle: 'Ciberseguridad y CTF',
    securityText:
      'Apasionado de la ciberseguridad. Me encanta aprender nuevas técnicas y superar retos de seguridad.',
    teamTitle: 'NUESTRO EQUIPO',
    team: [
      { name: 'TARIKELER', role: 'Fundador' },
      { name: 'TARIKELER-TARNAK', role: 'Infraestructura' },
      { name: 'Fruity Dev', role: 'DevOps' },
      { name: 'PixelShield', role: 'Seguridad' },
      { name: 'Mythora.de', role: 'Operaciones' },
    ],
    cv: {
      summary:
        'Desarrollador web que crea experiencias web modernas e integrales con Next.js, TypeScript e IA. Del diseño al despliegue: construyo productos que la gente usa.',
      experience: [
        {
          role: 'Fundador y Desarrollador Full-Stack',
          company: 'Fruity Dev',
          period: 'Actualidad',
          description:
            'Servicios profesionales de desarrollo web: aplicaciones web escalables y de alta calidad para clientes.',
        },
        {
          role: 'Propietario y Desarrollador',
          company: 'Mythora.de',
          period: 'Actualidad',
          description:
            'Una red SMP de Minecraft alemana totalmente desarrollada por mí: alojando jugadores de todo el mundo.',
        },
        {
          role: 'Desarrollador',
          company: 'PixelShield',
          period: 'Actualidad',
          description:
            'Protección DDoS para servidores de Minecraft: filtrado centrado en el protocolo para Java, Bedrock y Geyser.',
        },
        {
          role: 'Desarrollador',
          company: 'Portafolio y Proyectos de GitHub',
          period: 'Actualidad',
          description:
            'Extensiones de navegador, herramientas de IA y aplicaciones de utilidad publicadas en GitHub (Scribd-Download, AI-Jailbreak, Accentra, CodeHub y más).',
        },
      ],
      education: [
        {
          role: 'Desarrollador Autodidacta',
          company: 'Ciencias de la Computación e Ingeniería de Software',
          period: 'Continuo',
          description:
            'Aprendizaje práctico a través del desarrollo web, la ciberseguridad, los CTF y las plataformas de bug bounty.',
        },
      ],
    },
  },
  projects: {
    subtitle: 'PROYECTOS',
    title: 'Todos los Proyectos',
    description: '',
  },
  github: {
    subtitle: 'GITHUB',
    title: 'Proyectos de GitHub',
    description: 'Mis repositorios públicos, obtenidos en vivo desde mi perfil de GitHub.',
  },
  chat: {
    subtitle: 'CHAT',
    title: 'Chatea Conmigo',
    description: 'Deja un mensaje o solo saluda. Aparecerá al instante.',
  },
  profile: {
    firstName: 'TARIK',
    lastName: 'ELER',
    displayName: 'TARIKELER',
    nickname: 'Tarnak',
    title: 'Desarrollador y Arquitectura de Sistemas',
    experience: '3+ años',
    firstLanguage: 'Turco',
    otherLanguages: 'Inglés (B1)',
  },
  contact: {
    subtitle: 'CONTACTO',
    title: 'Contacto',
    description: '',
    footerText: '',
    successTitle: '¡Mensaje enviado!',
    successText:
      '¡Gracias por escribirme! He recibido tu mensaje y te responderé lo antes posible.',
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