/**
 * Admin veri katmani — kaynak kayit defteri.
 *
 * Neden boyle: admin panelinde tablo tablo CRUD kodu yazmak yerine, her tabloyu
 * VERI olarak tanimliyoruz. Tek bir genel API route'u ve tek bir genel tablo
 * bileseni bu tanimdan besleniyor. Yeni bir tablo eklemek = buraya bir nesne
 * eklemek. Yeni bir alan tipi eklemek = FieldType'a bir deger eklemek.
 *
 * ⚠️ GUVENLIK: `select *` ASLA kullanilmaz. `profiles` tablosunda
 * master_key_enc / master_key_salt / github_token_enc / admin_key_salt gibi
 * SIFRELI SIR kolonlari var; bunlar admin panelinde bile gosterilmemeli.
 * Her kaynak `listColumns` ile acik kolon listesi verir ve API yalnizca
 * o kolonlari ceker/yazar.
 *
 * Kolon adlari ve tipleri PostgREST OpenAPI semasindan DOGRULANARAK yazildi
 * (scripts/schema-probe.mjs), varsayimla degil.
 */

export type FieldType
  = | 'text'
    | 'textarea'
    | 'number'
    | 'boolean'
    | 'select'
    /**
     * ARANABILIR combobox (`SearchableCombobox`).
     * `select`ten farki: secenek listesi UZUN oldugunda (ornek 40+ dil)
     * yerel `<select>` kullanicinin arama yapmasina izin vermiyor.
     * Tarık "Bildiğim diller" eklerken dil ve seviye icin combobox istedi.
     */
    | 'combobox'
    | 'tags'
    | 'url'
    | 'image'
    | 'datetime'

export interface FieldDef {
  name: string
  label: string
  type: FieldType
  required?: boolean
  /** select / combobox icin secenekler */
  options?: readonly string[]
  placeholder?: string
  help?: string
  /** tablo listesinde kolon olarak goster */
  inTable?: boolean
  /** yalnizca yeni kayitta girilebilir (sonradan degistirilemez) */
  immutable?: boolean
  /** arama bu kolonda da calissin */
  searchable?: boolean
  maxLength?: number
  min?: number
  max?: number
}

export interface FilterOption {
  /** DB'ye yazilacak gercek deger (metin olarak) */
  value: string
  label: string
}

/**
 * Beyaz listeye alinmis filtre tanimi.
 *
 * ⚠️ GUVENLIK: istemci `f_<kolon>=<deger>` gonderir ama kolon adi ISTEKTEN
 * ALINMAZ — yalnizca burada tanimli filtreler kabul edilir. Aksi halde
 * saldirgan rastgele kolonlarda filtre deneyip (boolean oracle) tabloda
 * olmayan/olamayacagi veriyi ogrenebilirdi.
 */
export interface FilterDef {
  column: string
  label: string
  /** 'boolean' → deger true/false olarak yazilir; 'text' → aynen */
  type: 'boolean' | 'text'
  options: readonly FilterOption[]
}

export interface ResourceDef {
  /** URL parcasi: /api/admin/data/<key> */
  key: string
  /** Supabase tablo adi */
  table: string
  label: string
  description: string
  /** mdi ikon adi */
  icon: string
  idColumn: string
  /** Tabloda satirin ana metni */
  titleColumn: string
  orderBy: { column: string, ascending: boolean }
  /** SELECT edilecek kolonlar — asla '*' degil */
  listColumns: readonly string[]
  fields: readonly FieldDef[]
  /** Beyaz listeye alinmis filtreler (bkz. FilterDef guvenlik notu) */
  filters?: readonly FilterDef[]
  /** Yalnizca listeleme (ekleme/duzenleme/silme kapali) */
  readOnly?: boolean
  /** Tek satirlik kaynak (stats) — ekleme/silme yok, yalnizca duzenleme */
  singleton?: boolean
  /** Bu kolon bos birakilirsa `autoSlugFrom` alanindan slug uretilir */
  autoSlugFrom?: string
  /** Bu kaynakta arama yapilacak kolonlar */
  searchColumns: readonly string[]
}

const POSTS: ResourceDef = {
  key: 'posts',
  table: 'posts',
  label: 'Blog Yazıları',
  description: 'Blog yazılarını ekle, düzenle, yayınla veya sil.',
  icon: 'mdi:post-outline',
  idColumn: 'id',
  titleColumn: 'title',
  orderBy: { column: 'created_at', ascending: false },
  listColumns: ['id', 'slug', 'title', 'excerpt', 'tags', 'cover', 'published', 'created_at', 'updated_at'],
  searchColumns: ['title', 'slug', 'excerpt'],
  filters: [
    {
      column: 'published',
      label: 'Durum',
      type: 'boolean',
      options: [
        { value: 'true', label: 'Yayında' },
        { value: 'false', label: 'Taslak' },
      ],
    },
  ],
  autoSlugFrom: 'title',
  fields: [
    { name: 'title', label: 'Başlık', type: 'text', required: true, inTable: true, searchable: true, maxLength: 200 },
    { name: 'slug', label: 'Slug (URL)', type: 'text', placeholder: 'boş bırakılırsa başlıktan üretilir', help: 'Küçük harf, tire ile. Boş bırakırsan başlıktan otomatik üretilir.', maxLength: 120 },
    { name: 'excerpt', label: 'Özet', type: 'textarea', maxLength: 400, help: 'Kart üzerinde görünen kısa açıklama.' },
    { name: 'content', label: 'İçerik', type: 'textarea', required: true, maxLength: 100000, help: 'Markdown desteklenir.' },
    { name: 'tags', label: 'Etiketler', type: 'tags', help: 'Virgül ile ayır: nextjs, react' },
    { name: 'cover', label: 'Kapak görseli', type: 'image' },
    { name: 'published', label: 'Yayında', type: 'boolean', inTable: true },
  ],
}

const PROJECTS: ResourceDef = {
  key: 'projects',
  table: 'projects',
  label: 'Projeler',
  description: 'Portfolyo projelerini yönet.',
  icon: 'mdi:folder-star-outline',
  idColumn: 'id',
  titleColumn: 'title',
  orderBy: { column: 'sort_order', ascending: true },
  listColumns: ['id', 'slug', 'title', 'description', 'tech', 'repo_url', 'demo_url', 'image', 'featured', 'sort_order'],
  searchColumns: ['title', 'slug', 'description'],
  filters: [
    {
      column: 'featured',
      label: 'Öne çıkan',
      type: 'boolean',
      options: [
        { value: 'true', label: 'Öne çıkanlar' },
        { value: 'false', label: 'Diğerleri' },
      ],
    },
  ],
  autoSlugFrom: 'title',
  fields: [
    { name: 'title', label: 'Proje adı', type: 'text', required: true, inTable: true, searchable: true, maxLength: 120 },
    { name: 'slug', label: 'Slug (URL)', type: 'text', placeholder: 'boş bırakılırsa addan üretilir', maxLength: 120 },
    { name: 'description', label: 'Açıklama', type: 'textarea', maxLength: 1000 },
    { name: 'tech', label: 'Teknolojiler', type: 'tags', inTable: true, help: 'Virgül ile ayır: Next.js, TypeScript' },
    { name: 'repo_url', label: 'Repo bağlantısı', type: 'url' },
    { name: 'demo_url', label: 'Demo bağlantısı', type: 'url' },
    { name: 'image', label: 'Görsel', type: 'image' },
    { name: 'featured', label: 'Öne çıkan', type: 'boolean', inTable: true },
    { name: 'sort_order', label: 'Sıra', type: 'number', inTable: true, min: 0, max: 9999 },
  ],
}

const SKILLS: ResourceDef = {
  key: 'skills',
  table: 'skills',
  label: 'Yetenekler',
  description: 'Marquee/yetenek listesi ve seviyeleri.',
  icon: 'mdi:lightning-bolt-outline',
  idColumn: 'id',
  titleColumn: 'label',
  orderBy: { column: 'sort_order', ascending: true },
  listColumns: ['id', 'label', 'icon', 'level', 'years', 'description', 'project_ids', 'sort_order'],
  searchColumns: ['label', 'description'],
  fields: [
    { name: 'label', label: 'Ad', type: 'text', required: true, inTable: true, searchable: true, maxLength: 60 },
    { name: 'icon', label: 'İkon', type: 'text', required: true, inTable: true, placeholder: 'logos:nextjs-icon', help: 'Iconify ikon adi.' },
    { name: 'level', label: 'Seviye (0-100)', type: 'number', inTable: true, min: 0, max: 100 },
    { name: 'years', label: 'Deneyim (yıl)', type: 'number', inTable: true, min: 0, max: 60 },
    { name: 'description', label: 'Açıklama', type: 'textarea', maxLength: 500 },
    { name: 'sort_order', label: 'Sıra', type: 'number', min: 0, max: 9999 },
  ],
}

const STATS: ResourceDef = {
  key: 'stats',
  table: 'stats',
  label: 'İstatistikler',
  description: 'Ana sayfadaki sayılar (tek satır).',
  icon: 'mdi:chart-box-outline',
  idColumn: 'id',
  titleColumn: 'id',
  orderBy: { column: 'id', ascending: true },
  listColumns: ['id', 'projects', 'technologies', 'focus', 'experience_years'],
  searchColumns: [],
  singleton: true,
  fields: [
    { name: 'projects', label: 'Proje sayısı', type: 'number', inTable: true, min: 0, max: 9999 },
    { name: 'technologies', label: 'Teknoloji sayısı', type: 'number', inTable: true, min: 0, max: 9999 },
    { name: 'focus', label: 'Odak (%)', type: 'number', inTable: true, min: 0, max: 100 },
    { name: 'experience_years', label: 'Deneyim (yıl)', type: 'number', inTable: true, min: 0, max: 60 },
  ],
}

const MESSAGES: ResourceDef = {
  key: 'messages',
  table: 'messages',
  label: 'Mesajlar',
  description: 'İletişim formundan gelen mesajlar.',
  icon: 'mdi:email-outline',
  idColumn: 'id',
  titleColumn: 'name',
  orderBy: { column: 'created_at', ascending: false },
  listColumns: ['id', 'name', 'email', 'phone', 'subject', 'body', 'is_read', 'created_at'],
  searchColumns: ['name', 'email', 'subject', 'body'],
  filters: [
    {
      column: 'is_read',
      label: 'Okunma',
      type: 'boolean',
      options: [
        { value: 'false', label: 'Okunmamış' },
        { value: 'true', label: 'Okunmuş' },
      ],
    },
  ],
  fields: [
    { name: 'name', label: 'Ad', type: 'text', inTable: true, searchable: true, maxLength: 100 },
    { name: 'email', label: 'E-posta', type: 'text', inTable: true, searchable: true, maxLength: 200 },
    // phone kolonu eskiden tabloda yoktu; scripts/schema-fixes.sql ile eklenir.
    { name: 'phone', label: 'Telefon', type: 'text', maxLength: 40 },
    { name: 'subject', label: 'Konu', type: 'text', inTable: true, maxLength: 200 },
    { name: 'body', label: 'Mesaj', type: 'textarea', maxLength: 5000 },
    { name: 'is_read', label: 'Okundu', type: 'boolean', inTable: true },
  ],
}

const AD_SLOTS: ResourceDef = {
  key: 'ad-slots',
  table: 'ad_slots',
  label: 'Reklamlar',
  description: 'Reklam birimleri — destek sayfası ve /reklam sayfası.',
  icon: 'mdi:bullhorn-outline',
  idColumn: 'id',
  titleColumn: 'title',
  orderBy: { column: 'sort_order', ascending: true },
  listColumns: [
    'id', 'slug', 'title', 'description', 'kind', 'image_url', 'target_url',
    'sponsor', 'duration_seconds', 'placement', 'weight', 'is_active', 'sort_order',
  ],
  searchColumns: ['title', 'slug', 'sponsor'],
  filters: [
    {
      column: 'is_active',
      label: 'Durum',
      type: 'boolean',
      options: [
        { value: 'true', label: 'Aktif' },
        { value: 'false', label: 'Pasif' },
      ],
    },
    {
      column: 'placement',
      label: 'Yerleşim',
      type: 'text',
      options: [
        { value: 'ads-page', label: 'Reklam sayfası' },
        { value: 'donate', label: 'Destek sayfası' },
        { value: 'banner', label: 'Banner' },
      ],
    },
    {
      column: 'kind',
      label: 'Tür',
      type: 'text',
      options: [
        { value: 'image', label: 'Görsel' },
        { value: 'link', label: 'Bağlantı' },
        { value: 'html', label: 'HTML' },
        { value: 'adsense', label: 'AdSense' },
      ],
    },
  ],
  autoSlugFrom: 'title',
  fields: [
    { name: 'title', label: 'Başlık', type: 'text', required: true, inTable: true, searchable: true, maxLength: 120 },
    { name: 'slug', label: 'Slug', type: 'text', placeholder: 'boş bırakılırsa başlıktan üretilir', maxLength: 120 },
    { name: 'description', label: 'Açıklama', type: 'textarea', maxLength: 300 },
    { name: 'kind', label: 'Tür', type: 'select', required: true, inTable: true, options: ['image', 'link', 'html', 'adsense'] },
    { name: 'placement', label: 'Yerleşim', type: 'select', required: true, inTable: true, options: ['ads-page', 'donate', 'banner'] },
    { name: 'image_url', label: 'Görsel URL', type: 'image', help: 'kind=image için zorunlu.' },
    { name: 'target_url', label: 'Hedef bağlantı', type: 'text', maxLength: 500 },
    { name: 'html', label: 'Özel HTML', type: 'textarea', maxLength: 20000, help: 'kind=html için. Yalnızca admin girebilir.' },
    { name: 'sponsor', label: 'Sponsor', type: 'text', maxLength: 80 },
    { name: 'duration_seconds', label: 'Süre (sn)', type: 'number', inTable: true, min: 5, max: 120 },
    { name: 'weight', label: 'Ağırlık', type: 'number', min: 1, max: 100 },
    { name: 'is_active', label: 'Aktif', type: 'boolean', inTable: true },
    { name: 'sort_order', label: 'Sıra', type: 'number', min: 0, max: 9999 },
  ],
}

const PROFILES: ResourceDef = {
  key: 'profiles',
  table: 'profiles',
  label: 'Kullanıcı Profilleri',
  description: 'Kayıtlı kullanıcılar. Rol değiştirme buradan yapılır.',
  icon: 'mdi:account-group-outline',
  idColumn: 'id',
  titleColumn: 'username',
  orderBy: { column: 'created_at', ascending: false },
  // ⚠️ master_key_enc / master_key_salt / github_token_enc / admin_key_salt
  // BILEREK YOK — sifreli sir kolonlari, panelde asla gorunmemeli.
  listColumns: ['id', 'username', 'full_name', 'avatar_url', 'role', 'bio', 'github_handle', 'website', 'is_owner', 'created_at'],
  searchColumns: ['username', 'full_name', 'github_handle'],
  filters: [
    {
      column: 'role',
      label: 'Rol',
      type: 'text',
      options: [
        { value: 'admin', label: 'Yönetici' },
        { value: 'user', label: 'Kullanıcı' },
      ],
    },
  ],
  fields: [
    { name: 'username', label: 'Kullanıcı adı', type: 'text', inTable: true, searchable: true, maxLength: 60 },
    { name: 'full_name', label: 'Tam ad', type: 'text', inTable: true, maxLength: 120 },
    { name: 'bio', label: 'Biyografi', type: 'textarea', maxLength: 500 },
    { name: 'github_handle', label: 'GitHub kullanıcı adı', type: 'text', maxLength: 60 },
    { name: 'website', label: 'Web sitesi', type: 'url' },
    {
      name: 'role',
      label: 'Rol',
      type: 'select',
      inTable: true,
      options: ['user', 'admin'],
      help: 'Site sahibi hesabı korunur; rolü değiştirilemez.',
    },
  ],
}

const LANGUAGES: ResourceDef = {
  key: 'languages',
  table: 'languages',
  label: 'Bildiğim Diller',
  description: 'Konuşulan diller ve seviyeleri (A1–C2 / Ana dil).',
  icon: 'mdi:translate',
  idColumn: 'id',
  titleColumn: 'language',
  orderBy: { column: 'sort_order', ascending: true },
  listColumns: ['id', 'language', 'level', 'sort_order'],
  searchColumns: ['language'],
  autoSlugFrom: 'language',
  fields: [
    {
      name: 'language',
      label: 'Dil',
      type: 'combobox',
      required: true,
      inTable: true,
      searchable: true,
      options: [
        'Türkçe', 'İngilizce', 'Almanca', 'Fransızca', 'İspanyolca',
        'İtalyanca', 'Rusça', 'Portekizce', 'Arapça', 'Çince',
        'Japonca', 'Korece', 'Felemenkçe', 'İsveççe', 'Lehça',
        'Çekçe', 'Macarca', 'Romence', 'Bulgarca', 'Yunanca',
        'Fince', 'Danca', 'Norveççe', 'Farsça', 'Urduca',
        'Hintçe', 'Bengali', 'Vietnamca', 'Tayca', 'İbranice',
        'Ukraynaca', 'Sırpça', 'Hırvatça', 'Boşnakça', 'Arnavutça',
        'Azerice', 'Kazakça', 'Özbekçe', 'Kırgızca', 'Türkmence',
      ],
      help: 'Listeden bir dil seç ya da ara.',
    },
    {
      name: 'level',
      label: 'Seviye',
      type: 'combobox',
      required: true,
      inTable: true,
      options: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Ana dil'],
      help: 'A1: Başlangıç · A2: Temel · B1: Orta · B2: Üst-orta · C1: İleri · C2: İleri-üst · Ana dil: Anadil',
    },
    {
      name: 'sort_order',
      label: 'Sıra',
      type: 'number',
      min: 0,
      max: 9999,
    },
  ],
}

export const RESOURCES: readonly ResourceDef[] = [
  POSTS,
  PROJECTS,
  SKILLS,
  STATS,
  MESSAGES,
  AD_SLOTS,
  PROFILES,
  LANGUAGES,
]

export function getResource(key: string): ResourceDef | undefined {
  return RESOURCES.find(r => r.key === key)
}

/** API'nin kabul ettigi alan adlari (whitelist) — istemciden gelen fazla alan yok sayilir.
 *
 *  `immutable` alanlar yalnizca OLUSTURMADA yazilabilir; PATCH'te yok sayilir.
 *  (Bu alanlarin UI'da duzenlemede kilitli gorunmesinin sunucu tarafi budur.)
 */
export function writableFieldNames(resource: ResourceDef, mode: 'insert' | 'update' = 'insert'): string[] {
  return resource.fields
    .filter(f => mode === 'insert' || !f.immutable)
    .map(f => f.name)
}

/**
 * Istek parametrelerinden (`f_<kolon>=<deger>`) GECERLI filtreleri cikarir.
 *
 * ⚠️ GUVENLIK: kolon adi ve deger ISTEKTEN ALINMAZ — `resource.filters`
 * beyaz listesine karsi dogrulanir. Boylece:
 *   - tanimli olmayan bir kolonda filtre denenemez (saldirgan rastgele
 *     kolonlarda deneyip "boolean oracle" ile veri cikaramaz),
 *   - `type: 'boolean'` filtrede yalnizca `true`/`false` kabul edilir,
 *   - `type: 'text'` filtrede yalnizca tanimli secenekler kabul edilir.
 *
 * Gecersiz deger SESSIZCE yok sayilir (hata dondurup listeyi tumden
 * kirmaktansa filtreyi uygulamamak daha guvenli ve kullanici dostudur).
 */
export function resolveFilters(
  resource: ResourceDef,
  searchParams: URLSearchParams,
): { column: string, value: string | boolean }[] {
  const active: { column: string, value: string | boolean }[] = []

  for (const filter of resource.filters ?? []) {
    const raw = searchParams.get(`f_${filter.column}`)
    if (raw === null || raw === '') {
      continue
    }
    if (!filter.options.some(o => o.value === raw)) {
      continue
    }
    active.push({
      column: filter.column,
      value: filter.type === 'boolean' ? raw === 'true' : raw,
    })
  }

  return active
}
