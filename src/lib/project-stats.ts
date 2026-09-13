/**
 * Project stats — client-side localStorage counters.
 * Views: all actions by the same user on the same project
 * (Open Page, Open on GitHub, /github/OWNER/REPO visit)
 * count as ONE view: the `project-viewed:<title>` flag is checked.
 */

const STAT_KEY = (title: string) => `project-stats:${title}`
const VIEWED_KEY = (title: string) => `project-viewed:${title}`

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

/** Download counter (counts every click — not deduplicated like views). */
export function recordDownload(title: string): number {
  try {
    const current = readProjectStats(title)
    const next = { ...current, downloads: current.downloads + 1 }
    localStorage.setItem(STAT_KEY(title), JSON.stringify(next))
    return next.downloads
  }
  catch {
    return 0
  }
}
