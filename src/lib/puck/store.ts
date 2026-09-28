/**
 * Puck page data store.
 *
 * Primary: Supabase (puck_pages / puck_versions) — kalıcı, Cloudflare Workers'ta
 * da çalışır. Fallback: data/puck-*.json (build-time bundle) + bellek, yani
 * Supabase erişilemezse site yine ayakta kalır.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
// Baked into the worker bundle at build time (Workers has no fs).
import bundledPagesJson from '../../../data/puck-pages.json'
import bundledVersionsJson from '../../../data/puck-versions.json'
import { createAdminClient } from '@/lib/supabase/admin'
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

/** Supabase client ya da null (env yoksa / bağlantı hatasında). */
function db() {
  try {
    return createAdminClient()
  }
  catch {
    return null
  }
}

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

/* ---------- Pages ---------- */

export async function getPuckPages(): Promise<Record<string, unknown>> {
  const supabase = db()
  if (supabase) {
    const { data, error } = await supabase.from('puck_pages').select('page, data')
    if (!error && data) {
      const all: Record<string, unknown> = {}
      for (const row of data as Array<{ page: string, data: unknown }>)
        all[normalizePage(row.page)] = row.data
      memoryPages = all
      return all
    }
  }
  if (memoryPages)
    return memoryPages
  const all = await readJson(PUCK_FILE)
  memoryPages = Object.keys(all).length ? all : bundledPages
  return memoryPages
}

export async function getPuckPage(page: string): Promise<unknown | null> {
  const key = normalizePage(page)
  const supabase = db()
  if (supabase) {
    const { data, error } = await supabase
      .from('puck_pages')
      .select('data')
      .eq('page', key)
      .maybeSingle()
    if (error) {
      // Daha önce hata yutulup build-time bayat bundle döndürülüyordu; admin
      // bayat veriyi canlı sayfanın üstüne kaydedebiliyordu. Artık
      // çağıran taraf hatayı görüp karar veriyor.
      console.error(`[puck] "${key}" okunamadı:`, error.message)
      throw new Error(`Puck sayfası okunamadı: ${error.message}`)
    }
    return (data as { data?: unknown } | null)?.data ?? null
  }
  const all = await getPuckPages()
  return all[key] ?? null
}

export async function savePuckPage(page: string, data: unknown): Promise<void> {
  const key = normalizePage(page)
  const supabase = db()
  if (supabase) {
    const { error } = await supabase
      .from('puck_pages')
      .upsert({ page: key, data, updated_at: new Date().toISOString() }, { onConflict: 'page' })
    if (error) {
      // Daha önce hata yutuluyordu: route {success:true} dönüyor, admin düzenlemesi
      // Workers'ta sessizce yok oluyordu. Artık yazılamadıysa hata fırlatıyoruz.
      console.error(`[puck] "${key}" yazılamadı:`, error.message)
      throw new Error(`Puck sayfası kaydedilemedi: ${error.message}`)
    }
    memoryPages = null
    return
  }
  const all = await getPuckPages()
  all[key] = data
  memoryPages = all
  await writeJson(PUCK_FILE, all)
}

export async function deletePuckPage(page: string): Promise<void> {
  const key = normalizePage(page)
  const supabase = db()
  if (supabase) {
    const { error } = await supabase.from('puck_pages').delete().eq('page', key)
    if (error) {
      // Hata halinde yalnızca bellekte silmek satırı DB'de bırakıyordu ve
      // kullanıcı "silindi" sanıyordu.
      console.error(`[puck] "${key}" silinemedi:`, error.message)
      throw new Error(`Puck sayfası silinemedi: ${error.message}`)
    }
    memoryPages = null
    return
  }
  const all = await getPuckPages()
  if (key in all) {
    delete all[key]
    memoryPages = all
    await writeJson(PUCK_FILE, all)
  }
}

/* ---------- Version (edit history) ---------- */

export async function getPuckVersions(page: string): Promise<PuckVersion[]> {
  const key = normalizePage(page)
  const supabase = db()
  if (supabase) {
    const { data, error } = await supabase
      .from('puck_versions')
      .select('id, page, name, data, ts')
      .eq('page', key)
      .order('ts', { ascending: false })
      .limit(MAX_VERSIONS)
    if (!error && data) {
      return (data as Array<{ id: string, name: string, data: unknown, ts: string }>)
        .map(row => ({ id: row.id, name: row.name, ts: row.ts, data: row.data }))
    }
  }
  const all = memoryVersions ?? await readJson(VERSIONS_FILE)
  const list = all[key]
  if (Array.isArray(list))
    return list as PuckVersion[]
  const bundledList = bundledVersions[key]
  return Array.isArray(bundledList) ? (bundledList as PuckVersion[]) : []
}

export async function addPuckVersion(page: string, name: string, data: unknown): Promise<PuckVersion[]> {
  const key = normalizePage(page)
  const version: PuckVersion = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: (name || 'Düzen').slice(0, 80),
    ts: new Date().toISOString(),
    data,
  }
  const supabase = db()
  if (supabase) {
    const { error } = await supabase.from('puck_versions').insert({
      id: version.id,
      page: key,
      name: version.name,
      data: version.data,
      ts: version.ts,
    })
    if (!error) {
      // Eski sürümleri budla.
      const { data } = await supabase
        .from('puck_versions')
        .select('id')
        .eq('page', key)
        .order('ts', { ascending: false })
      const ids = (data as Array<{ id: string }> | null)?.map(r => r.id) ?? []
      const stale = ids.slice(MAX_VERSIONS)
      if (stale.length > 0)
        await supabase.from('puck_versions').delete().in('id', stale)
      return getPuckVersions(page)
    }
  }
  const all = memoryVersions ?? await readJson(VERSIONS_FILE)
  const list = Array.isArray(all[key]) ? (all[key] as PuckVersion[]) : []
  const next = [version, ...list].slice(0, MAX_VERSIONS)
  all[key] = next
  memoryVersions = all
  await writeJson(VERSIONS_FILE, all)
  return next
}

export async function removePuckVersion(page: string, id: string): Promise<PuckVersion[]> {
  const key = normalizePage(page)
  const supabase = db()
  if (supabase) {
    const { error } = await supabase
      .from('puck_versions')
      .delete()
      .eq('page', key)
      .eq('id', id)
    if (!error)
      return getPuckVersions(page)
  }
  const all = memoryVersions ?? await readJson(VERSIONS_FILE)
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

async function writeJson(file: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
  }
  catch { /* Workers: in-memory only */ }
}
