/**
 * Project stats — client-side localStorage counters.
 * Views: all actions by the same user on the same project
 * (Open Page, Open on GitHub, /github/OWNER/REPO visit)
 * count as ONE view: the `project-viewed:<title>` flag is checked.
 */

const STAT_KEY = (title: string) => `project-stats:${title}`
const VIEWED_KEY = (title: string) => `project-viewed:${title}`
const DOWNLOADED_KEY = (title: string) => `project-downloaded:${title}`

export interface ProjectStats {
  views: number
  downloads: number
}

export function readProjectStats(title: string): ProjectStats {
  if (typeof localStorage === 'undefined')
    return { views: 0, downloads: 0 }
  try {
    const raw = localStorage.getItem(STAT_KEY(title))
    const stored = raw ? JSON.parse(raw) : {}
    return {
      views: typeof stored.views === 'number' ? stored.views : 0,
      downloads: typeof stored.downloads === 'number' ? stored.downloads : 0,
    }
  }
  catch {
    return { views: 0, downloads: 0 }
  }
}

/** Increments the view count — no-op if the user already "saw" this project. */
export function recordProjectView(title: string): number {
  try {
    if (localStorage.getItem(VIEWED_KEY(title))) {
      return readProjectStats(title).views
    }
    const current = readProjectStats(title)
    const next = { ...current, views: current.views + 1 }
    localStorage.setItem(STAT_KEY(title), JSON.stringify(next))
    localStorage.setItem(VIEWED_KEY(title), '1')
    return next.views
  }
  catch {
    return readProjectStats(title).views
  }
}

/**
 * Download counter — aynı kullanıcı için TEK KEZ sayılır.
 * `project-downloaded:<title>` bayrağı ile dedup: aynı kişi tekrar indirse
 * sayaç artmaz. Sayaçları sıfırlamak için: localStorage'daki `project-stats:*`
 * ve `project-downloaded:*` anahtarları silinir (resetProjectStats).
 */
export function recordDownload(title: string): number {
  try {
    if (localStorage.getItem(DOWNLOADED_KEY(title))) {
      return readProjectStats(title).downloads
    }
    const current = readProjectStats(title)
    const next = { ...current, downloads: current.downloads + 1 }
    localStorage.setItem(STAT_KEY(title), JSON.stringify(next))
    localStorage.setItem(DOWNLOADED_KEY(title), '1')
    return next.downloads
  }
  catch {
    return 0
  }
}

/** Tüm proje sayaçlarını (görüntülenme + indirme + dedup bayrakları) sıfırlar. */
export function resetProjectStats(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('project-stats:') || k.startsWith('project-viewed:') || k.startsWith('project-downloaded:')))
        keys.push(k)
    }
    for (const k of keys)
      localStorage.removeItem(k)
  }
  catch { /* localStorage yoksa no-op */ }
}
