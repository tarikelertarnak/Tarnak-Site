/**
 * Puck page data store — data/puck-pages.json (same pattern as the content file).
 * Cloudflare Workers has no filesystem: reads fall back to in-memory store,
 * writes are best-effort (persist in memory for the worker lifetime).
 */
import fs from 'node:fs/promises'
import path from 'node:path'
// Baked into the worker bundle at build time (Workers has no fs).
import bundledPagesJson from '../../../data/puck-pages.json'
import bundledVersionsJson from '../../../data/puck-versions.json'
import { normalizePage } from './normalize'

const DATA_DIR = path.join(process.cwd(), 'data')
const PUCK_FILE = path.join(DATA_DIR, 'puck-pages.json')
const VERSIONS_FILE = path.join(DATA_DIR, 'puck-versions.json')

const bundledPages = bundledPagesJson as Record<string, unknown>
const bundledVersions = bundledVersionsJson as Record<string, unknown>

export interface PuckVersion { id: string, name: string, ts: string, data: unknown }

const MAX_VERSIONS = 10

let memoryPages: Record<string, unknown> | null = null
let memoryVersions: Record<string, unknown> | null = null

async function readJson(file: string): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(file, 'utf-8')
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  }
  catch {
    return {}
  }
}

export async function getPuckPages(): Promise<Record<string, unknown>> {
  if (memoryPages)
    return memoryPages
  const all = await readJson(PUCK_FILE)
  memoryPages = Object.keys(all).length ? all : bundledPages
  return memoryPages
}

export async function getPuckPage(page: string): Promise<unknown | null> {
  const all = await getPuckPages()
  return all[normalizePage(page)] ?? null
}

/* ---------- Version (edit history) management ---------- */

export async function getPuckVersions(page: string): Promise<PuckVersion[]> {
  const all = memoryVersions ?? await readJson(VERSIONS_FILE)
  const key = normalizePage(page)
  const list = all[key]
  if (Array.isArray(list))
    return list as PuckVersion[]
  const bundledList = bundledVersions[key]
  return Array.isArray(bundledList) ? (bundledList as PuckVersion[]) : []
}

async function writeJson(file: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
  }
  catch { /* Workers: in-memory only */ }
}

export async function addPuckVersion(page: string, name: string, data: unknown): Promise<PuckVersion[]> {
  const all = memoryVersions ?? await readJson(VERSIONS_FILE)
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
  memoryVersions = all
  await writeJson(VERSIONS_FILE, all)
  return next
}

export async function removePuckVersion(page: string, id: string): Promise<PuckVersion[]> {
  const all = memoryVersions ?? await readJson(VERSIONS_FILE)
  const key = normalizePage(page)
  const list = Array.isArray(all[key]) ? (all[key] as PuckVersion[]) : []
  const next = list.filter(v => v.id !== id)
  all[key] = next
  memoryVersions = all
  await writeJson(VERSIONS_FILE, all)
  return next
}

export async function getPuckVersion(page: string, id: string): Promise<PuckVersion | null> {
  const list = await getPuckVersions(page)
  return list.find(v => v.id === id) ?? null
}

export async function savePuckPage(page: string, data: unknown): Promise<void> {
  const all = await getPuckPages()
  all[normalizePage(page)] = data
  memoryPages = all
  await writeJson(PUCK_FILE, all)
}

export async function deletePuckPage(page: string): Promise<void> {
  const all = await getPuckPages()
  const key = normalizePage(page)
  if (key in all) {
    delete all[key]
    memoryPages = all
    await writeJson(PUCK_FILE, all)
  }
}
