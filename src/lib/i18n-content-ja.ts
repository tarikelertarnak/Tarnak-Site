import type { SiteContent } from '@/lib/content'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** 日本語 — overlay over the Turkish base (data/content.json). */
export const jaContentOverlay: DeepPartial<SiteContent> = {
  hero: {
    name: 'TARIK ELER',
    tagline: '開発者 & システムアーキテクト',
    badge: '',
    description:
      'Next.js、TypeScript、AIでモダンなWeb体験を生み出します。デザインからデプロイメントまで、すべてを手がけます。',
    exploreLabel: 'プロジェクトを見る',
    connectLabel: 'お問い合わせ',
    emoji: '🚀',
    stats: [
      { label: 'プロジェクト', value: '10+' },
      { label: 'テクノロジー', value: '15+' },
      { label: 'フォーカス', value: '100%' },
    ],
  },
  nav: {
    ctaLabel: 'GitHub',
    items: [
      { title: 'プロジェクト', href: '/projects' },
      { title: 'ブログ', href: '/blog' },
      { title: 'チャット', href: '/chat' },
      { title: 'お問い合わせ', href: '/#contact' },
    ],
  },
  about: {
    subtitle: 'プロフィール',
    title: '私の世界を見る',
    description: '',
    whoTitle: '私は誰か',
    whoText:
      'コードを書くことと製品づくりを愛するWeb開発者です。Web開発、デザイン、テクノロジーが私の情熱です。',
    toolboxTitle: 'ツールボックス',
    toolboxDescription: 'プロジェクトやWebサイトの構築に使っているテクノロジー。',
    beyondTitle: 'コードの先へ',
    beyondDescription: 'プログラミングをしないときにしていること：趣味と関心ごと。',
    securityTitle: 'サイバーセキュリティ & CTF',
    securityText:
      'サイバーセキュリティに情熱を注いでいます。新しい技術を学び、セキュリティの課題に挑戦するのが大好きです。',
    teamTitle: 'チーム',
    team: [
      { name: 'TARIKELER', role: '創業者' },
      { name: 'tarikelertarnak', role: 'インフラ' },
      { name: 'Fruity Dev', role: 'DevOps' },
      { name: 'PixelShield', role: 'セキュリティ' },
      { name: 'Mythora.de', role: '運営' },
    ],
    cv: {
      summary:
        'Next.js、TypeScript、AIでモダンで包括的なWeb体験を創り出すWeb開発者。デザインからデプロイメントまで：人々が使う製品を構築します。',
      experience: [
        {
          role: '創業者 & フルスタック開発者',
          company: 'Fruity Dev',
          period: '現在',
          description:
            'プロフェッショナルなWeb開発サービス：クライアント向けの拡張性の高い高品質Webアプリケーション。',
        },
        {
          role: 'オーナー & 開発者',
          company: 'Mythora.de',
          period: '現在',
          description:
            '私が完全に開発したドイツのMinecraft SMPネットワーク：世界中のプレイヤーをホストしています。',
        },
        {
          role: '開発者',
          company: 'PixelShield',
          period: '現在',
          description:
            'Minecraftサーバー向けDDoS防御：Java、Bedrock、Geyser向けのプロトコル中心フィルタリング。',
        },
        {
          role: '開発者',
          company: 'ポートフォリオ & GitHubプロジェクト',
          period: '現在',
          description:
            'ブラウザ拡張機能、AIツール、実用アプリをGitHubで公開（Scribd-Download、AI-Jailbreak、Accentra、CodeHub など）。',
        },
      ],
      education: [
        {
          role: '独学の開発者',
          company: 'コンピュータサイエンス & ソフトウェア工学',
          period: '継続中',
          description:
            'Web開発、サイバーセキュリティ、CTF、バグバウンティプラットフォームによる実践的な学習。',
        },
      ],
    },
  },
  projects: {
    subtitle: 'プロジェクト',
    title: 'すべてのプロジェクト',
    description: '',
  },
  github: {
    subtitle: 'GITHUB',
    title: 'GitHubプロジェクト',
    description: 'GitHubプロフィールからライブで取得した公開リポジトリ。',
  },
  chat: {
    subtitle: 'チャット',
    title: '私とチャット',
    description: 'メッセージを残すか、挨拶だけでもどうぞ。すぐに表示されます。',
  },
  profile: {
    firstName: 'TARIK',
    lastName: 'ELER',
    displayName: 'TARIKELER',
    nickname: 'Tarnak',
    title: '開発者 & システムアーキテクト',
    experience: '3年以上',
    firstLanguage: 'トルコ語',
    otherLanguages: '英語 (B1)',
  },
  contact: {
    subtitle: 'お問い合わせ',
    title: 'お問い合わせ',
    description: '',
    footerText: '',
    successTitle: 'メッセージを送信しました！',
    successText:
      'お問い合わせありがとうございます！メッセージを受け取りました。できるだけ早く返信します。',
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