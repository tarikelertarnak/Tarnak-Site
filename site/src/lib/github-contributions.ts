/**
 * GitHub katkı takvimi (2026-10-31).
 *
 * Veri build sırasında `scripts/fetch-github-data.cjs` tarafından
 * `public/github-contributions.json` olarak üretilir (GraphQL
 * `contributionsCollection`). Buradaki fonksiyonlar SAF: ağ yok, `Date.now()`
 * yok — böylece doğrudan test edilebilirler.
 *
 * NEDEN DOĞRULAMA: dosya `public/` altında duruyor, yani istenirse elle
 * değiştirilebilir. Bozuk bir dosya sayfayı çökertmesin diye şekil kontrol
 * edilir; geçmezse `null` döner ve bölüm hiç çizilmez (uydurma sayı YOK).
 */

export interface ContributionDay {
  /** ISO tarih — `YYYY-MM-DD`. */
  date: string
  count: number
}

/** Bir günün depo kırılımı (GitHub "Contribution activity" paneli). */
export interface ContributionRepo {
  /** `sahip/depo` — ör. `tarikelertarnak/Player`. */
  repo: string
  /** Depo bağlantısı. */
  url: string
  /** O gün o depoya giden commit sayısı. */
  count: number
}

export interface ContributionCalendar {
  /** Yıl toplamı (ham verideki `totalContributions`). */
  total: number
  /** Hafta sütunları; her sütun o haftanın günleri (Pazar→Cumartesi). */
  weeks: ContributionDay[][]
  /**
   * Gün → depo kırılımı. Yalnızca COMMIT katkılarını içerir (issue/PR yok);
   * bir gün burada yoksa panel "N katkı" der, depo listesi çizilmez.
   */
  activity: Record<string, ContributionRepo[]>
  from: string
  to: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Ham JSON'u doğrular ve normalize eder.
 *
 * @returns geçerli takvim, ya da şekil bozuksa `null`.
 */
export function normalizeContributions(raw: unknown): ContributionCalendar | null {
  if (!raw || typeof raw !== 'object')
    return null

  const source = raw as { weeks?: unknown, total?: unknown }
  if (!Array.isArray(source.weeks) || source.weeks.length === 0)
    return null

  const weeks: ContributionDay[][] = []
  for (const week of source.weeks) {
    if (!Array.isArray(week) || week.length === 0)
      return null

    const days: ContributionDay[] = []
    for (const day of week) {
      if (!day || typeof day !== 'object')
        return null
      const { date, count } = day as { date?: unknown, count?: unknown }
      if (typeof date !== 'string' || !ISO_DATE.test(date))
        return null
      if (typeof count !== 'number' || !Number.isFinite(count) || count < 0)
        return null
      days.push({ date, count: Math.floor(count) })
    }
    weeks.push(days)
  }

  const all = weeks.flat()
  const total = typeof source.total === 'number' && Number.isFinite(source.total) && source.total >= 0
    ? Math.floor(source.total)
    : all.reduce((sum, day) => sum + day.count, 0)

  return {
    total,
    weeks,
    activity: normalizeActivity((raw as { activity?: unknown }).activity),
    from: all[0].date,
    to: all[all.length - 1].date,
  }
}

/**
 * `activity` haritasını doğrular: `{ "YYYY-MM-DD": [{ repo, url, count }] }`.
 *
 * Bozuk kayıt SESSİZCE ATILIR (sayfayı çökertmek yerine depo listesi eksik
 * kalır). Eski snapshot'larda alan hiç yoktur → boş nesne döner.
 */
export function normalizeActivity(raw: unknown): Record<string, ContributionRepo[]> {
  if (!raw || typeof raw !== 'object')
    return {}

  const out: Record<string, ContributionRepo[]> = {}
  for (const [date, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!ISO_DATE.test(date) || !Array.isArray(value))
      continue

    const list: ContributionRepo[] = []
    for (const item of value) {
      if (!item || typeof item !== 'object')
        continue
      const { repo, url, count } = item as { repo?: unknown, url?: unknown, count?: unknown }
      if (typeof repo !== 'string' || typeof count !== 'number' || !Number.isFinite(count) || count <= 0)
        continue
      list.push({
        repo,
        url: typeof url === 'string' && url ? url : `https://github.com/${repo}`,
        count: Math.floor(count),
      })
    }
    if (list.length > 0)
      out[date] = list.sort((a, b) => b.count - a.count || a.repo.localeCompare(b.repo))
  }
  return out
}

/** Takvimdeki en yoğun gün — renk ölçeğinin üst sınırı. */
export function maxDayCount(weeks: ContributionDay[][]): number {
  let max = 0
  for (const week of weeks) {
    for (const day of week) {
      if (day.count > max)
        max = day.count
    }
  }
  return max
}

/**
 * Günlük katkıyı 0-4 renk seviyesine indirger.
 *
 * ponytail: GitHub kendi çeyrekliklerini kullanır; burada en yoğun güne göre
 * göreli dört dilim var. Veri dağılımı kökten değişirse (ör. günde 200+ katkı)
 * dilimler seyrek görünür — o zaman sabit eşiklere geçilmeli.
 */
export function contributionLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0)
    return 0
  if (max <= 0)
    return 1

  const ratio = count / max
  if (ratio <= 0.25)
    return 1
  if (ratio <= 0.5)
    return 2
  if (ratio <= 0.75)
    return 3
  return 4
}

export interface MonthSegment {
  /** Kısa ay adı (aktif dile göre: "Eki", "Oct"). */
  label: string
  /** Kaç hafta sütununu kapsıyor — etiketin genişliği bu. */
  span: number
}

/** `YYYY-MM-DD` → UTC gece yarısı (saat dilimi kaymasız). */
function parseIsoDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

/**
 * Ay etiketlerini hafta sütunlarına böler (GitHub takvimindeki üst şerit).
 *
 * Her haftanın İLK gününün ayı belirleyicidir; ay değiştiğinde yeni segment
 * açılır. Segment genişlikleri toplamı `weeks.length` olur — böylece etiketler
 * hücrelerle hizalanır.
 */
export function monthSegments(weeks: ContributionDay[][], locale: string): MonthSegment[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })

  const segments: MonthSegment[] = []
  let currentKey = ''
  for (const week of weeks) {
    if (!week.length)
      continue

    const first = week[0].date
    const key = first.slice(0, 7)
    if (key === currentKey) {
      segments[segments.length - 1].span += 1
      continue
    }

    currentKey = key
    segments.push({ label: formatter.format(parseIsoDate(first)), span: 1 })
  }
  return segments
}

/** Hücre ipucu metni: "31 Eki 2026 · 3 katkı". */
export function dayLabel(date: string, count: number, locale: string, unit: string): string {
  const formatted = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseIsoDate(date))
  return `${formatted} · ${count} ${unit}`
}

/**
 * İngilizce sıra sayısı eki: 1st / 2nd / 3rd / 11th … 22nd.
 * GitHub'ın ipucu metni "on June 5th" biçiminde olduğu için gerekli.
 */
export function ordinalDay(day: number): string {
  const mod100 = day % 100
  if (mod100 >= 11 && mod100 <= 13)
    return `${day}th`
  switch (day % 10) {
    case 1: return `${day}st`
    case 2: return `${day}nd`
    case 3: return `${day}rd`
    default: return `${day}th`
  }
}

/**
 * Hover ipucu tarihi — GitHub gibi: "June 5th" (en), "5 Haziran" (diğer).
 * Yıl YOK: ipucu kısa kalır, panel başlığı tam tarihi verir.
 */
export function formatHoverDate(date: string, locale: string): string {
  const d = parseIsoDate(date)
  if (locale.toLowerCase().startsWith('en')) {
    const month = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(d)
    return `${month} ${ordinalDay(d.getUTCDate())}`
  }
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(d)
}

/** Panel başlığı — tam tarih: "June 5, 2026" / "5 Haziran 2026". */
export function formatActivityDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseIsoDate(date))
}
