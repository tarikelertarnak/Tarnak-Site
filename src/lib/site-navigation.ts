/**
 * Site haritasi — footer'daki GEZİNME listesini uretir.
 *
 * Neden ayri modul: eskiden footer yalnizca `content.nav.items` (4 baglanti)
 * gosteriyordu; `/about`, `/github`, `/reklam`, `/donate`, `/credits`,
 * `/search` gibi sayfalar ve ana sayfa BOLUMLERI hic listede yoktu.
 * Kullanici "tum sayfalar, bolumler, ozel sayfalar, alt sayfalar" istedi.
 *
 * NOT: `/admin` ve `/puck` BILINCLI olarak dahil — kullanici "her sey
 * olmali" dedi. Her ikisi de sunucu tarafinda oturum/yetki ile korunuyor,
 * o yuzden listede gorunmeleri guvenlik sorunu degil.
 *
 * Blog / proje DETAY sayfalari dinamik (`/blog/[slug]`); bunlar veri
 * geldiginde `content.blog` uzerinden eklenir (bkz. `appendContentLinks`).
 */

export interface NavEntry {
  id: string
  label: string
  href: string
  /** true ise ayni sekmede acilir (diger her sey yeni sekmede degil) */
  external?: boolean
}

export interface NavGroup {
  id: string
  title: string
  entries: NavEntry[]
}

interface Labels {
  home: string
  about: string
  projects: string
  blog: string
  chat: string

  donate: string
  credits: string
  uses: string
  now: string
  changelog: string
  privacy: string
  kvkk: string
  login: string
  panel: string
  contact: string
  pages: string
  sections: string
  account: string
}

/**
 * Toggle'dan bagimsiz, sabit rota listesi.
 * Sirasi onemli: en cok kullanilan ustte.
 */
function buildStaticGroups(l: Labels): NavGroup[] {
  return [
    {
      id: 'pages',
      title: l.pages,
      entries: [
        { id: 'home', label: l.home, href: '/' },
        { id: 'about', label: l.about, href: '/about' },
        { id: 'projects', label: l.projects, href: '/projects' },
        { id: 'blog', label: l.blog, href: '/blog' },
        { id: 'chat', label: l.chat, href: '/chat' },

        { id: 'donate', label: l.donate, href: '/donate' },
        { id: 'credits', label: l.credits, href: '/credits' },
        // Faz 6 — kişisel sayfalar
        { id: 'uses', label: l.uses, href: '/uses' },
        { id: 'now', label: l.now, href: '/now' },
        { id: 'changelog', label: l.changelog, href: '/changelog' },
      ],
    },
    {
      // Faz 6 — hukuki metinler gezinmeden ayrı tutuldu; footer'ın alt
      // satırındaki ikincil alana bağlanır (her sayfa "herkese açık"
      // gezinme listesinde şişiklik yapmasın).
      id: 'legal',
      title: l.pages,
      entries: [
        { id: 'privacy', label: l.privacy, href: '/gizlilik' },
        { id: 'kvkk', label: l.kvkk, href: '/kvkk' },
      ],
    },
    {
      id: 'sections',
      title: l.sections,
      // 2026-10-04: `/#bolum` capalari kaldirildi — her bolumun artik gercek
      // bir sayfasi var, butun linkler normal rota (hero'daki # istegiyle ayni).
      entries: [
        { id: 'sec-about', label: l.about, href: '/about/' },
        { id: 'sec-projects', label: l.projects, href: '/projects/' },
        { id: 'sec-blog', label: l.blog, href: '/blog/' },
        // Faz 4 · 4 — kaynaklar (araç/link listesi)

        { id: 'sec-contact', label: l.contact, href: '/contact/' },
      ],
    },
    {
      id: 'account',
      title: l.account,
      entries: [
        { id: 'login', label: l.login, href: '/login' },
        { id: 'panel', label: l.panel, href: '/admin' },
      ],
    },
  ]
}

/**
 * `content.nav.items` icindeki baglantilari ekler — panelden yeni bir
 * ozel sayfa eklenirse footer otomatik guncellenir. Zaten var olan href'ler
 * TEKRAR eklenmez (cift kayit olmasin).
 */
function appendContentLinks(
  groups: NavGroup[],
  items: { title?: string; href?: string }[] | undefined,
): NavGroup[] {
  if (!items?.length) {
    return groups
  }

  const known = new Set(groups.flatMap((g) => g.entries.map((e) => e.href)))
  const extra: NavEntry[] = []

  items.forEach((item, i) => {
    const href = item.href?.trim()
    const label = item.title?.trim()
    if (!href || !label || known.has(href)) {
      return
    }
    known.add(href)
    extra.push({ id: `content-${i}`, label, href })
  })

  if (!extra.length) {
    return groups
  }

  return groups.map((g) =>
    g.id === 'pages' ? { ...g, entries: [...g.entries, ...extra] } : g,
  )
}

/**
 * Footer icin tum gezinme baglantilari.
 * `t` (ceviri fonksiyonu) disaridan verilir — bilesen/her yer kullanabilir.
 */
export function buildSiteNavigation(
  t: (key: string) => string,
  navItems?: { title?: string; href?: string }[],
): NavGroup[] {
  const labels: Labels = {
    home: t('nav.home'),
    about: t('nav.about'),
    projects: t('nav.projects'),
    blog: t('nav.blog'),
    chat: t('nav.chat'),

    donate: t('nav.donate'),
    credits: t('nav.credits'),
    uses: t('nav.uses'),
    now: t('nav.now'),
    changelog: t('nav.changelog'),
    privacy: t('nav.privacy'),
    kvkk: t('nav.kvkk'),
    login: t('nav.login'),
    panel: t('nav.adminPanel'),
    contact: t('footer.contactTitle'),
    pages: t('nav.pages'),
    sections: t('nav.sections'),
    account: t('nav.account'),
  }

  return appendContentLinks(buildStaticGroups(labels), navItems)
}
