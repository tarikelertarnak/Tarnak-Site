import type { SiteContent } from '@/lib/content'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** Русский — overlay over the Turkish base (data/content.json). */
export const ruContentOverlay: DeepPartial<SiteContent> = {
  hero: {
    name: 'TARIK ELER',
    tagline: 'Разработчик и системный архитектор',
    badge: '',
    description:
      'Создаю современные веб-проекты на Next.js, TypeScript и ИИ. Веду проект от дизайна до деплоя — целиком.',
    exploreLabel: 'Смотреть проекты',
    connectLabel: 'Связаться',
    emoji: '🚀',
    stats: [
      { label: 'Проекты', value: '10+' },
      { label: 'Технологии', value: '15+' },
      { label: 'Фокус', value: '100%' },
    ],
  },
  nav: {
    ctaLabel: 'GitHub',
    items: [
      { title: 'Проекты', href: '/projects' },
      { title: 'Блог', href: '/blog' },
      { title: 'Чат', href: '/chat' },
      { title: 'Контакты', href: '/#contact' },
    ],
  },
  about: {
    subtitle: 'ОБО МНЕ',
    title: 'Взгляд на мой мир',
    description: '',
    whoTitle: 'Кто я?',
    whoText:
      'Веб-разработчик, который любит писать код и создавать продукты. Веб-разработка, дизайн и технологии — моя страсть.',
    toolboxTitle: 'Мой инструментарий',
    toolboxDescription: 'Технологии, которые я использую при создании проектов и сайтов.',
    beyondTitle: 'За пределами кода',
    beyondDescription: 'Узнайте, чем я занимаюсь, когда не программирую: мои интересы и хобби.',
    securityTitle: 'Кибербезопасность и CTF',
    securityText:
      'Увлекаюсь кибербезопасностью. Люблю изучать новые техники и решать задачи по безопасности.',
    teamTitle: 'НАША КОМАНДА',
    team: [
      { name: 'TARIKELER', role: 'Основатель' },
      { name: 'tarikelertarnak', role: 'Инфраструктура' },
      { name: 'Fruity Dev', role: 'DevOps' },
      { name: 'PixelShield', role: 'Безопасность' },
      { name: 'Mythora.de', role: 'Операции' },
    ],
    cv: {
      summary:
        'Веб-разработчик, создающий современные комплексные веб-проекты на Next.js, TypeScript и ИИ. От дизайна до деплоя: я создаю продукты, которыми пользуются люди.',
      experience: [
        {
          role: 'Основатель и full-stack разработчик',
          company: 'Fruity Dev',
          period: 'Сейчас',
          description:
            'Профессиональные услуги веб-разработки: масштабируемые, высококачественные веб-приложения для клиентов.',
        },
        {
          role: 'Владелец и разработчик',
          company: 'Mythora.de',
          period: 'Сейчас',
          description:
            'Немецкая SMP-сеть Minecraft, полностью разработанная мной: хостит игроков со всего мира.',
        },
        {
          role: 'Разработчик',
          company: 'PixelShield',
          period: 'Сейчас',
          description:
            'DDoS-защита для серверов Minecraft: фильтрация на уровне протокола для Java, Bedrock и Geyser.',
        },
        {
          role: 'Разработчик',
          company: 'Портфолио и проекты на GitHub',
          period: 'Сейчас',
          description:
            'Расширения для браузера, ИИ-инструменты и утилиты, опубликованные на GitHub (Scribd-Download, AI-Jailbreak, Accentra, CodeHub и др.).',
        },
      ],
      education: [
        {
          role: 'Самоучка',
          company: 'Информатика и разработка ПО',
          period: 'Постоянно',
          description:
            'Практическое обучение через веб-разработку, кибербезопасность, CTF и платформы bug bounty.',
        },
      ],
    },
  },
  projects: {
    subtitle: 'ПРОЕКТЫ',
    title: 'Все проекты',
    description: '',
  },
  github: {
    subtitle: 'GITHUB',
    title: 'Проекты GitHub',
    description: 'Мои публичные репозитории, загружаемые вживую с моего профиля GitHub.',
  },
  chat: {
    subtitle: 'ЧАТ',
    title: 'Пообщайся со мной',
    description: 'Оставьте сообщение или просто поздоровайтесь. Оно появится мгновенно.',
  },
  profile: {
    firstName: 'TARIK',
    lastName: 'ELER',
    displayName: 'TARIKELER',
    nickname: 'Tarnak',
    title: 'Разработчик и системный архитектор',
    experience: '3+ года',
    firstLanguage: 'Турецкий',
    otherLanguages: 'Английский (B1)',
  },
  contact: {
    subtitle: 'КОНТАКТЫ',
    title: 'Контакты',
    description: '',
    footerText: '',
    successTitle: 'Сообщение отправлено!',
    successText:
      'Спасибо за ваше сообщение! Я получил его и отвечу как можно скорее.',
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