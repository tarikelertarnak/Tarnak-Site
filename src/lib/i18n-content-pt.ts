import type { SiteContent } from '@/lib/content'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** Português (BR) — overlay over the Turkish base (data/content.json). */
export const ptContentOverlay: DeepPartial<SiteContent> = {
  hero: {
    name: 'TARIK ELER',
    tagline: 'Desenvolvedor & Arquiteto de Sistemas',
    badge: '',
    description:
      'Crio experiências web modernas com Next.js, TypeScript e IA. Do design ao deploy, eu conduzo tudo de ponta a ponta.',
    exploreLabel: 'Explorar projetos',
    connectLabel: 'Fale comigo',
    emoji: '🚀',
    stats: [
      { label: 'Projetos', value: '10+' },
      { label: 'Tecnologias', value: '15+' },
      { label: 'Foco', value: '100%' },
    ],
  },
  nav: {
    ctaLabel: 'GitHub',
    items: [
      { title: 'Projetos', href: '/projects' },
      { title: 'Blog', href: '/blog' },
      { title: 'Chat', href: '/chat' },
      { title: 'Contato', href: '/#contact' },
    ],
  },
  about: {
    subtitle: 'SOBRE MIM',
    title: 'Um Olhar no Meu Mundo',
    description: '',
    whoTitle: 'Quem sou eu?',
    whoText:
      'Desenvolvedor web que ama escrever código e criar produtos. Desenvolvimento web, design e tecnologia são minha paixão.',
    toolboxTitle: 'Minha Caixa de Ferramentas',
    toolboxDescription: 'Tecnologias que uso para construir projetos e sites.',
    beyondTitle: 'Além do Código',
    beyondDescription:
      'Descubra o que eu faço quando não estou programando: meus interesses e hobbies.',
    securityTitle: 'Cibersegurança & CTF',
    securityText:
      'Apaixonado por cibersegurança. Adoro aprender novas técnicas e superar desafios de segurança.',
    teamTitle: 'NOSSO TIME',
    team: [
      { name: 'TARIKELER', role: 'Fundador' },
      { name: 'TARIKELER-TARNAK', role: 'Infraestrutura' },
      { name: 'Fruity Dev', role: 'DevOps' },
      { name: 'PixelShield', role: 'Segurança' },
      { name: 'Mythora.de', role: 'Operações' },
    ],
    cv: {
      summary:
        'Desenvolvedor web que cria experiências web modernas e completas com Next.js, TypeScript e IA. Do design ao deploy: construo produtos que as pessoas usam.',
      experience: [
        {
          role: 'Fundador & Desenvolvedor Full-Stack',
          company: 'Fruity Dev',
          period: 'Atualmente',
          description:
            'Serviços profissionais de desenvolvimento web: aplicações web escaláveis e de alta qualidade para clientes.',
        },
        {
          role: 'Proprietário & Desenvolvedor',
          company: 'Mythora.de',
          period: 'Atualmente',
          description:
            'Uma rede SMP de Minecraft alemã desenvolvida inteiramente por mim: hospedando jogadores do mundo todo.',
        },
        {
          role: 'Desenvolvedor',
          company: 'PixelShield',
          period: 'Atualmente',
          description:
            'Proteção DDoS para servidores Minecraft: filtragem voltada a protocolo para Java, Bedrock e Geyser.',
        },
        {
          role: 'Desenvolvedor',
          company: 'Portfólio & Projetos GitHub',
          period: 'Atualmente',
          description:
            'Extensões de navegador, ferramentas de IA e aplicativos utilitários publicados no GitHub (Scribd-Download, AI-Jailbreak, Accentra, CodeHub e outros).',
        },
      ],
      education: [
        {
          role: 'Desenvolvedor Autodidata',
          company: 'Ciência da Computação & Engenharia de Software',
          period: 'Contínuo',
          description:
            'Aprendizado prático por meio de desenvolvimento web, cibersegurança, CTFs e plataformas de bug bounty.',
        },
      ],
    },
  },
  projects: {
    subtitle: 'PROJETOS',
    title: 'Todos os Projetos',
    description: '',
  },
  github: {
    subtitle: 'GITHUB',
    title: 'Projetos GitHub',
    description: 'Meus repositórios públicos, carregados ao vivo do meu perfil no GitHub.',
  },
  chat: {
    subtitle: 'CHAT',
    title: 'Converse comigo',
    description: 'Deixe uma mensagem ou apenas diga oi. Ela aparecerá na hora.',
  },
  profile: {
    firstName: 'TARIK',
    lastName: 'ELER',
    displayName: 'TARIKELER',
    nickname: 'Tarnak',
    title: 'Desenvolvedor & Arquiteto de Sistemas',
    experience: '3+ anos',
    firstLanguage: 'Turco',
    otherLanguages: 'Inglês (B1)',
  },
  contact: {
    subtitle: 'CONTATO',
    title: 'Contato',
    description: '',
    footerText: '',
    successTitle: 'Mensagem enviada!',
    successText:
      'Obrigado pela sua mensagem! Eu a recebi e responderei o mais rápido possível.',
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