/**
 * Project stats — server-backed download/view counters (2026-10-22).
 *
 * Views: all actions by the same visitor on the same project (Open Page,
 * Open on GitHub, /github/OWNER/REPO visit) count as ONE view: the
 * `project-viewed:<title>` flag is checked. Same dedup for downloads.
 *
 * Source of truth is now the server (`/api/project-stats` → Supabase
 * `project_stats` table). localStorage keeps the per-visitor dedup flags
 * so each visitor counts once; the actual count lives in the database.
 *
 * The synchronous helpers below are kept for backward compatibility and
 * fall back to localStorage when the server is unavailable.
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

/** Fetch the server-side count (returns 0/0 when unavailable). */
export async function fetchProjectStats(title: string): Promise<ProjectStats> {
  try {
    const res = await fetch(`/api/project-stats?title=${encodeURIComponent(title)}`, { cache: 'no-store' })
    if (!res.ok)
      return readProjectStats(title)
    const data = await res.json() as { views?: number, downloads?: number }
    return { views: data.views ?? 0, downloads: data.downloads ?? 0 }
  }
  catch {
    return readProjectStats(title)
  }
}

/** Fetch all project stats in one request (for grids). */
export async function fetchAllProjectStats(): Promise<Record<string, ProjectStats>> {
  const out: Record<string, ProjectStats> = {}
  try {
    const res = await fetch('/api/project-stats?list=1', { cache: 'no-store' })
    if (!res.ok)
      return out
    const data = await res.json() as { items?: { title: string, views: number, downloads: number }[] }
    for (const it of data.items ?? []) {
      out[it.title] = { views: it.views ?? 0, downloads: it.downloads ?? 0 }
    }
  }
  catch { /* keep empty */ }
  return out
}

/** Increments the view count on the server — no-op if already viewed. */
export async function recordProjectViewAsync(title: string): Promise<number> {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(VIEWED_KEY(title))) {
      const s = await fetchProjectStats(title)
      return s.views
    }
    const res = await fetch('/api/project-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type: 'view' }),
    })
    const data = res.ok ? await res.json() as { views?: number } : null
    const next = data?.views ?? readProjectStats(title).views + 1
    if (typeof localStorage !== 'undefined') {
      try {
        const current = readProjectStats(title)
        localStorage.setItem(STAT_KEY(title), JSON.stringify({ ...current, views: next }))
        localStorage.setItem(VIEWED_KEY(title), '1')
      }
      catch { /* ignore */ }
    }
    return next
  }
  catch {
    return recordProjectView(title)
  }
}

/** Download counter — counted once per visitor. */
export async function recordDownloadAsync(title: string): Promise<number> {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(DOWNLOADED_KEY(title))) {
      const s = await fetchProjectStats(title)
      return s.downloads
    }
    const res = await fetch('/api/project-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type: 'download' }),
    })
    const data = res.ok ? await res.json() as { downloads?: number } : null
    const next = data?.downloads ?? readProjectStats(title).downloads + 1
    if (typeof localStorage !== 'undefined') {
      try {
        const current = readProjectStats(title)
        localStorage.setItem(STAT_KEY(title), JSON.stringify({ ...current, downloads: next }))
        localStorage.setItem(DOWNLOADED_KEY(title), '1')
      }
      catch { /* ignore */ }
    }
    return next
  }
  catch {
    return recordDownload(title)
  }
}

// ── Backward-compat sync helpers ─────────────────────────────────────────
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
