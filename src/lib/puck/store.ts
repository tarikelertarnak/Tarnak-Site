/**
 * Puck page data store — data/puck-pages.json (same pattern as the content file).
 */
import fs from 'fs/promises'
import path from 'path'
import { normalizePage } from './normalize'

const DATA_DIR = path.join(process.cwd(), 'data')
const PUCK_FILE = path.join(DATA_DIR, 'puck-pages.json')
const VERSIONS_FILE = path.join(DATA_DIR, 'puck-versions.json')

export type PuckVersion = { id: string; name: string; ts: string; data: unknown }

const MAX_VERSIONS = 10

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function readJson(file: string): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(file, 'utf-8')
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export async function getPuckPages(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(PUCK_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export async function getPuckPage(page: string): Promise<unknown | null> {
  const all = await getPuckPages()
  return all[normalizePage(page)] ?? null
}

/* ---------- Version (edit history) management ---------- */

export async function getPuckVersions(page: string): Promise<PuckVersion[]> {
  const all = await readJson(VERSIONS_FILE)
  const list = all[normalizePage(page)]
  return Array.isArray(list) ? (list as PuckVersion[]) : []
}

export async function addPuckVersion(page: string, name: string, data: unknown): Promise<PuckVersion[]> {
  await ensureDataDir()
  const all = await readJson(VERSIONS_FILE)
  const key = normalizePage(page)
  const list = Array.isArray(all[key]) ? (all[key] as PuckVersion[]) : []
  const version: PuckVersion = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: (name || 'Düzen').slice(0, 80),
    ts: new Date().toISOString(),
    data,
  }
  const next = [version, ...list].slice(0, MAX_VERSIONS)
  all[key] = next
  await fs.writeFile(VERSIONS_FILE, `${JSON.stringify(all, null, 2)}\n`, 'utf-8')
  return next
}

export async function removePuckVersion(page: string, id: string): Promise<PuckVersion[]> {
  await ensureDataDir()
  const all = await readJson(VERSIONS_FILE)
  const key = normalizePage(page)
  const list = Array.isArray(all[key]) ? (all[key] as PuckVersion[]) : []
  const next = list.filter((v) => v.id !== id)
  all[key] = next
  await fs.writeFile(VERSIONS_FILE, `${JSON.stringify(all, null, 2)}\n`, 'utf-8')
  return next
}

export async function getPuckVersion(page: string, id: string): Promise<PuckVersion | null> {
  const list = await getPuckVersions(page)
  return list.find((v) => v.id === id) ?? null
}

export async function savePuckPage(page: string, data: unknown): Promise<void> {
  await ensureDataDir()
  const all = await getPuckPages()
  all[normalizePage(page)] = data
  await fs.writeFile(PUCK_FILE, `${JSON.stringify(all, null, 2)}\n`, 'utf-8')
}

export async function deletePuckPage(page: string): Promise<void> {
  const all = await getPuckPages()
  const key = normalizePage(page)
  if (key in all) {
    delete all[key]
    await fs.writeFile(PUCK_FILE, `${JSON.stringify(all, null, 2)}\n`, 'utf-8')
  }
}