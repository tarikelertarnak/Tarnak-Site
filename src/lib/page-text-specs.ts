/**
 * SAYFA METİN KATALOĞU (2026-10-30).
 *
 * Neden: admin "Sayfa Düzenle" yalnızca önceden tanımlı birkaç alanı
 * gösteriyordu; Boss "her sayfanın en üstünde dil seçici olsun, metni kopyalayıp
 * yapay zekâya çevirteyim, yapıştırınca otomatik işlensin" dedi. Bu dosya
 * sayfa → düzenlenebilir metin listesini TEK yerde tanımlar; panel ve
 * içe aktarma aynı katalogu kullanır (kopyala → çevir → yapıştır aynı
 * anahtarlarla eşleşir).
 *
 * ANAHTAR BİÇİMİ: `<kaynak>:<yol>`
 *   · `content:about.title`  → `data/content.json` alanı (TR tabanı)
 *   · `dict:blog.sub`        → `src/i18n/*.json` arayüz metni
 *
 * Böylece düz metin satırları (`content:about.title: Hakkımda`) hem insan
 * hem yapay zekâ için okunur, JSON'a çevirmeye gerek kalmaz.
 */

export type TextSource = 'content' | 'dict'

export interface TextField {
  /** `content:` veya `dict:` önekli anahtar. */
  key: string
  label: string
  multiline?: boolean
}

export interface TextGroup {
  title: string
  fields: TextField[]
}

export interface PageSpec {
  id: string
  label: string
  /** Public yol — göz (önizleme) düğmesi buraya gider. */
  path: string
  icon: string
  groups: TextGroup[]
}

function f(key: string, label: string, multiline = false): TextField {
  return {
  key,
  label,
  multiline,
}
}

export const PAGE_SPECS: PageSpec[] = [
  {
    id: 'home',
    label: 'Ana Sayfa',
    path: '/',
    icon: 'mdi:home-outline',
    groups: [
      {
        title: 'Hero',
        fields: [
          f('content:hero.name', 'Ad'),
          f('content:hero.tagline', 'Alt başlık'),
          f('content:hero.badge', 'Rozet'),
          f('content:hero.description', 'Açıklama', true),
          f('content:hero.exploreLabel', 'Keşfet butonu'),
          f('content:hero.connectLabel', 'İletişim butonu'),
          f('content:hero.stats.0.label', 'İstatistik 1 · etiket'),
          f('content:hero.stats.0.value', 'İstatistik 1 · değer'),
          f('content:hero.stats.1.label', 'İstatistik 2 · etiket'),
          f('content:hero.stats.1.value', 'İstatistik 2 · değer'),
          f('content:hero.stats.2.label', 'İstatistik 3 · etiket'),
          f('content:hero.stats.2.value', 'İstatistik 3 · değer'),
        ],
      },
      {
        title: 'Menü ve alt bilgi',
        fields: [
          f('content:nav.ctaLabel', 'Menü CTA'),
          f('content:footer.copyright', 'Alt bilgi telif'),
          f('dict:hero.projects', 'Bölüm adı · Projeler'),
          f('dict:hero.blog', 'Bölüm adı · Blog'),
          f('dict:hero.about', 'Bölüm adı · Hakkımda'),
          f('dict:hero.techStack', 'Teknoloji şeridi başlığı'),
          f('dict:hero.scrollDown', 'Aşağı kaydır etiketi'),
        ],
      },
    ],
  },
  {
    id: 'about',
    label: 'Hakkımda',
    path: '/about',
    icon: 'mdi:account-circle-outline',
    groups: [
      {
        title: 'Sayfa metinleri',
        fields: [
          f('content:about.subtitle', 'Alt başlık'),
          f('content:about.title', 'Başlık'),
          f('content:about.description', 'Açıklama', true),
          f('content:about.whoTitle', 'Who Am I? başlığı'),
          f('content:about.whoText', 'Who Am I? metni', true),
          f('content:about.toolboxTitle', 'Toolbox başlığı'),
          f('content:about.toolboxDescription', 'Toolbox açıklaması', true),
          f('content:about.beyondTitle', 'Beyond Code başlığı'),
          f('content:about.beyondDescription', 'Beyond Code açıklaması', true),
          f('content:about.securityTitle', 'Güvenlik başlığı'),
          f('content:about.securityText', 'Güvenlik metni', true),
          f('content:about.teamTitle', 'Ekip başlığı'),
        ],
      },
      {
        title: 'Profil',
        fields: [
          f('content:profile.firstName', 'Ad'),
          f('content:profile.lastName', 'Soyad'),
          f('content:profile.displayName', 'Görünen ad'),
          f('content:profile.nickname', 'Takma ad'),
          f('content:profile.title', 'Ünvan'),
          f('content:profile.experience', 'Deneyim'),
          f('content:profile.firstLanguage', 'Ana dil'),
          f('content:profile.otherLanguages', 'Diğer diller'),
        ],
      },
      {
        title: 'Hakkımda sayfası (/about)',
        fields: [
          f('dict:about.areasTitle', 'Çalışma alanları başlığı'),
          f('dict:about.journeyTitle', 'Yolculuk başlığı'),
          f('dict:about.valuesTitle', 'Değerler başlığı'),
          f('dict:about.languagesTitle', 'Diller başlığı'),
          f('dict:about.infoTitle', 'Kişisel bilgiler başlığı'),
          f('dict:about.infoCardTitle', 'Bilgi kartı başlığı'),
          f('dict:about.cvTitle', 'CV başlığı'),
          f('dict:about.cvSummaryTitle', 'CV özet başlığı'),
          f('dict:about.cvEducation', 'CV eğitim bölümü'),
          f('dict:about.cvExperience', 'CV deneyim bölümü'),
          f('dict:about.emptyTitle', 'Boş durum başlığı'),
          f('dict:about.emptyDesc', 'Boş durum açıklaması', true),
        ],
      },
    ],
  },
  {
    id: 'projects',
    label: 'Projeler',
    path: '/projects',
    icon: 'mdi:folder-outline',
    groups: [
      {
        title: 'Sayfa metinleri',
        fields: [
          f('content:projects.subtitle', 'Alt başlık'),
          f('content:projects.title', 'Başlık'),
          f('content:projects.description', 'Açıklama', true),
        ],
      },
      {
        title: 'Arayüz metinleri',
        fields: [
          f('dict:projects.title', 'Sayfa başlığı (sözlük)'),
          f('dict:projects.viewAll', 'Tümünü gör'),
          f('dict:projects.githubBtn', 'GitHub butonu'),
          f('dict:projects.search', 'Arama yer tutucusu'),
          f('dict:projects.empty', 'Boş durum'),
          f('dict:projects.download', 'İndirme'),
        ],
      },
    ],
  },
  {
    id: 'blog',
    label: 'Blog',
    path: '/blog',
    icon: 'mdi:post-outline',
    groups: [
      {
        title: 'Başlık ve açıklama',
        fields: [
          f('dict:blog.sub', 'Büyük başlık'),
          f('dict:blog.desc', 'Açıklama', true),
          f('dict:blog.all', 'Tüm yazılar butonu'),
          f('dict:blog.search', 'Arama yer tutucusu'),
          f('dict:blog.sort', 'Sıralama etiketi'),
          f('dict:blog.empty', 'Boş durum'),
          f('dict:blog.noResults', 'Sonuç yok'),
          f('dict:blog.related', 'İlgili yazılar başlığı'),
          f('dict:blog.minRead', 'Okuma süresi etiketi'),
        ],
      },
    ],
  },
  {
    id: 'chat',
    label: 'Sohbet',
    path: '/chat',
    icon: 'mdi:chat-outline',
    groups: [
      {
        title: 'Bölüm metinleri',
        fields: [
          f('content:chat.subtitle', 'Alt başlık'),
          f('content:chat.title', 'Başlık'),
          f('content:chat.description', 'Açıklama', true),
        ],
      },
      {
        title: 'Sohbet arayüzü',
        fields: [
          f('dict:chat.chats', 'Sohbetler'),
          f('dict:chat.general', 'Genel sohbet'),
          f('dict:chat.placeholder', 'Mesaj yer tutucusu'),
          f('dict:chat.send', 'Gönder'),
          f('dict:chat.empty', 'Boş durum'),
          f('dict:chat.online', 'Çevrimiçi'),
          f('dict:chat.loginRequired', 'Giriş gerekli'),
        ],
      },
    ],
  },
  {
    id: 'contact',
    label: 'İletişim',
    path: '/contact',
    icon: 'mdi:email-outline',
    groups: [
      {
        title: 'Bölüm metinleri',
        fields: [
          f('content:contact.subtitle', 'Alt başlık'),
          f('content:contact.title', 'Başlık'),
          f('content:contact.description', 'Açıklama', true),
          f('content:contact.footerText', 'Alt metin'),
          f('content:contact.successTitle', 'Gönderim sonrası başlık'),
          f('content:contact.successText', 'Gönderim sonrası metin', true),
        ],
      },
      {
        title: 'Form',
        fields: [
          f('dict:contact.name', 'Ad'),
          f('dict:contact.email', 'E-posta'),
          f('dict:contact.phone', 'Telefon'),
          f('dict:contact.message', 'Mesaj'),
          f('dict:contact.send', 'Gönder'),
          f('dict:contact.sending', 'Gönderiliyor'),
          f('dict:contact.required', 'Zorunlu alan'),
        ],
      },
    ],
  },
  {
    id: 'donate',
    label: 'Destek',
    path: '/donate',
    icon: 'mdi:heart-outline',
    groups: [
      {
        title: 'Destek sayfası',
        fields: [
          f('dict:donate.title', 'Sayfa başlığı'),
          f('dict:donate.description', 'Açıklama', true),
          f('dict:donate.heading', 'Büyük başlık'),
          f('dict:donate.method', 'Yöntem'),
          f('dict:donate.thanks', 'Teşekkür metni', true),
          f('dict:donate.githubSponsors', 'GitHub sponsorlar'),
          f('dict:donate.patreon', 'Patreon'),
          f('dict:donate.kofi', 'Ko-fi'),
          f('dict:donate.buymeacoffee', 'Buy Me a Coffee'),
        ],
      },
    ],
  },
  {
    id: 'now',
    label: 'Şu An',
    path: '/now',
    icon: 'mdi:clock-outline',
    groups: [
      {
        title: 'Şu an içeriği',
        fields: [
          f('content:phase6.now.updated', 'Güncelleme tarihi'),
          f('content:phase6.now.learning', 'Öğrendiklerim (her satır bir madde)', true),
          f('content:phase6.now.building', 'Ürettiklerim (her satır bir madde)', true),
          f('content:phase6.now.reading', 'Okuduklarım (her satır bir madde)', true),
          f('content:phase6.now.listening', 'Dinlediklerim (her satır bir madde)', true),
        ],
      },
      {
        title: 'Başlıklar',
        fields: [
          f('dict:now.learning', 'Öğrendiklerim başlığı'),
          f('dict:now.building', 'Ürettiklerim başlığı'),
          f('dict:now.reading', 'Okuduklarım başlığı'),
          f('dict:now.listening', 'Dinlediklerim başlığı'),
          f('dict:now.updated', 'Güncelleme etiketi'),
          f('dict:nav.now', 'Menü adı'),
        ],
      },
    ],
  },
  {
    id: 'credits',
    label: 'Katkıda Bulunanlar',
    path: '/credits',
    icon: 'mdi:trophy-outline',
    groups: [
      {
        title: 'Sayfa metinleri',
        fields: [
          f('dict:credits.heading', 'Büyük başlık'),
          f('dict:credits.contributors', 'Katkıda bulunanlar'),
          f('dict:credits.filterAll', 'Filtre · tümü'),
          f('dict:credits.roleFounder', 'Rol · kurucu'),
          f('dict:credits.beFirstDonor', 'İlk destekçi metni'),
          f('dict:credits.earned', 'Kazanılan'),
          f('dict:nav.credits', 'Menü adı'),
        ],
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Gizlilik Politikası',
    path: '/gizlilik',
    icon: 'mdi:shield-lock-outline',
    groups: [
      {
        title: 'Sayfa içeriği',
        fields: [
          f('content:phase6.privacy.title', 'Başlık'),
          f('content:phase6.privacy.updated', 'Son güncelleme'),
          f('content:phase6.privacy.body', 'Metin (paragrafları boş satırla ayır)', true),
          f('dict:nav.privacy', 'Menü adı'),
        ],
      },
    ],
  },
  {
    id: 'kvkk',
    label: 'KVKK',
    path: '/kvkk',
    icon: 'mdi:file-shield-outline',
    groups: [
      {
        title: 'Sayfa içeriği',
        fields: [
          f('content:phase6.kvkk.title', 'Başlık'),
          f('content:phase6.kvkk.updated', 'Son güncelleme'),
          f('content:phase6.kvkk.body', 'Metin (paragrafları boş satırla ayır)', true),
          f('dict:nav.kvkk', 'Menü adı'),
        ],
      },
    ],
  },
  {
    id: 'github',
    label: 'GitHub',
    path: '/github/TARIKTR1099',
    icon: 'mdi:github',
    groups: [
      {
        title: 'Bölüm metinleri',
        fields: [
          f('content:github.subtitle', 'Alt başlık'),
          f('content:github.title', 'Başlık'),
          f('content:github.description', 'Açıklama', true),
          f('content:settings.githubUsername', 'GitHub kullanıcı adı'),
        ],
      },
    ],
  },
]

/** Tüm sayfalardaki tüm alanlar (dil yönetimi sayımı için). */
export const ALL_TEXT_FIELDS: TextField[] = PAGE_SPECS.flatMap(p =>
  p.groups.flatMap(g => g.fields),
)

export function findPage(id: string): PageSpec | undefined {
  return PAGE_SPECS.find(p => p.id === id)
}

/** `content:hero.name` → `{ source: 'content', path: 'hero.name' }` */
export function parseTextFieldKey(key: string): { source: TextSource, path: string } {
  const idx = key.indexOf(':')
  if (idx < 0)
    return { source: 'content', path: key }
  const source = key.slice(0, idx) === 'dict' ? 'dict' : 'content'
  return { source, path: key.slice(idx + 1) }
}

/** Nokta yolu ile okur (`phase6.now.updated`, `hero.stats.0.label`). */
export function getPath(source: unknown, path: string): unknown {
  let current: unknown = source
  for (const part of path.split('.')) {
    if (current === null || current === undefined)
      return undefined
    if (Array.isArray(current))
      current = current[Number(part)]
    else if (typeof current === 'object')
      current = (current as Record<string, unknown>)[part]
    else
      return undefined
  }
  return current
}

/**
 * Nokta yoluna yazar; ara nesneleri/dizileri gerektiği gibi kurar.
 * `undefined`/boş metin → alan silinir (geri dönüş davranışı).
 */
export function setPath<T>(source: T, path: string, value: unknown): T {
  const parts = path.split('.')
  const root: Record<string, unknown> = Array.isArray(source)
    ? ([...source] as unknown as Record<string, unknown>)
    : { ...(source as Record<string, unknown>) }

  let current: Record<string, unknown> | unknown[] = root
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    const nextPart = parts[i + 1]
    const isIndex = /^\d+$/.test(nextPart)
    const existing: unknown = Array.isArray(current)
      ? (current as unknown[])[Number(part)]
      : (current as Record<string, unknown>)[part]

    let next: Record<string, unknown> | unknown[]
    if (Array.isArray(existing))
      next = [...existing]
    else if (existing && typeof existing === 'object')
      next = { ...(existing as Record<string, unknown>) }
    else
      next = isIndex ? [] : {}

    if (Array.isArray(current))
      (current as unknown[])[Number(part)] = next
    else
      (current as Record<string, unknown>)[part] = next
    current = next
  }

  const last = parts[parts.length - 1]
  if (Array.isArray(current))
    (current as unknown[])[Number(last)] = value
  else
    (current as Record<string, unknown>)[last] = value

  return root as T
}

/** Nokta yolunu siler (boş bırakılan çeviri anahtarı). */
export function deletePath<T>(source: T, path: string): T {
  const parts = path.split('.')
  if (!parts.length)
    return source
  const clone = structuredCloneSafe(source)
  let current: unknown = clone
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current || typeof current !== 'object')
      return clone as T
    current = Array.isArray(current)
      ? (current as unknown[])[Number(parts[i])]
      : (current as Record<string, unknown>)[parts[i]]
  }
  if (current && typeof current === 'object') {
    if (Array.isArray(current))
      (current as unknown[])[Number(parts[parts.length - 1])] = undefined
    else
      delete (current as Record<string, unknown>)[parts[parts.length - 1]]
  }
  return clone as T
}

function structuredCloneSafe<T>(value: T): T {
  try {
    return structuredClone(value)
  }
  catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

/** Değeri metne çevirir (diziler satır satır). */
export function asText(value: unknown): string {
  if (Array.isArray(value))
    return value.map(v => String(v)).join('\n')
  if (value === null || value === undefined)
    return ''
  return String(value)
}

/**
 * İçe aktarma metnini ayrıştırır.
 *
 * Kabul edilen biçimler:
 *   1) `content:about.title: Hakkımda`  (satır başına bir alan)
 *   2) `content:about.title = Hakkımda`
 *   3) JSON: `{ "content:about.title": "Hakkımda" }`
 *
 * Dönen `unknown` değer: çok satırlı alanlar `\n` ile birleşir; yalnız
 * `content:phase6.now.learning` gibi liste alanları satırlara bölünür.
 */
export function parsePastedText(input: string): Record<string, string> {
  const trimmed = input.trim()
  if (!trimmed)
    return {}

  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>
      const out: Record<string, string> = {}
      for (const [key, value] of Object.entries(json)) {
        if (typeof value === 'string' || typeof value === 'number')
          out[key.trim()] = String(value)
        else if (Array.isArray(value))
          out[key.trim()] = value.map(v => String(v)).join('\n')
      }
      return out
    }
    catch {
      // JSON değilse düz metin ayrıştırmasına düş.
    }
  }

  const out: Record<string, string> = {}
  let currentKey: string | null = null
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    const match = line.match(/^\s*([a-z]+:[^\s=]+)\s*[:=]\s?(.*)$/i)
    if (match) {
      currentKey = match[1]
      out[currentKey] = match[2]
      continue
    }
    // Çok satırlı devam: bir önceki anahtara ekle.
    if (currentKey && line.trim())
      out[currentKey] = `${out[currentKey]}\n${line}`.trim()
  }
  return out
}

/** Liste alanları: satır listesi olarak saklanır (now/learning gibi). */
export function isListField(key: string): boolean {
  return /^(?:content:)?(?:phase6\.)?now\.(?:learning|building|reading|listening)$/.test(key)
}

/** İçe aktarılan metni alan tipine göre değere çevirir. */
export function coerceFieldValue(key: string, text: string): unknown {
  const value = text.trim()
  if (!value)
    return ''
  if (isListField(key))
    return value.split('\n').map(s => s.trim()).filter(Boolean)
  return value
}
