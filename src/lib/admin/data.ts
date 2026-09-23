import { createClient } from '@supabase/supabase-js'

import type { FieldDef, ResourceDef } from '@/lib/admin/resources'
import { writableFieldNames } from '@/lib/admin/resources'
import { missingColumnFrom } from '@/lib/postgrest'

/**
 * Admin veri katmani — ortak yardimcilar.
 *
 * Guvenlik kurallari:
 *  1) Yalnizca `resource.fields` icindeki alanlar yazilabilir (whitelist).
 *     Istemciden gelen fazladan alanlar sessizce YOK SAYILIR.
 *  2) `immutable` alanlar yalnizca OLUSTURMADA yazilabilir, PATCH'te yok sayilir.
 *  3) Tablo/kolon adlari KODDAN gelir, istekten degil — SQL injection yuzeyi yok.
 *  4) service_role anahtari yalnizca sunucuda kullanilir.
 */

export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key)
    return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/** Turkce karakterleri de dogru ceviren slug uretici.
 *
 *  Neden once NFD: JS'te `'İ'.toLowerCase()` tek bir 'i' DEGIL,
 *  'i' + U+0307 (birlesik nokta) uretir. O nokta da alfanumerik olmadigi
 *  icin tireye donusur ve "İçin" -> "i-cin" gibi BOZUK slug cikardi.
 *  NFD ile ayirip birlesik isaretleri silince "İçin" -> "icin" olur.
 *  Bonus: é, ñ, å gibi diger Latin aksanlari da kendiliginden cozulur.
 *  `ı` (noktasiz i) ayristirilamaz, o yuzden ayrica eslenir.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

type CoerceResult
  = | { ok: true, value: unknown }
    | { ok: false, error: string }

/** Istemciden gelen ham degeri alan tipine cevirir ve dogrular. */
export function coerce(field: FieldDef, raw: unknown): CoerceResult {
  // 1) Alana hic dokunulmadi → mevcut deger korunur (PATCH icin onemli)
  if (raw === undefined) {
    if (field.required) {
      return { ok: false, error: `${field.label} zorunlu.` }
    }
    return { ok: true, value: undefined }
  }

  // 2) Alan ACIKCA bosaltildi → NULL yaz.
  //    Bunu "dokunulmadi"dan ayirmak zorundayiz; yoksa kullanici bir alani
  //    temizlediginde eski deger sessizce geri gelirdi.
  if (raw === null || raw === '') {
    if (field.required) {
      return { ok: false, error: `${field.label} zorunlu.` }
    }
    if (field.type === 'tags') {
      return { ok: true, value: [] }
    }
    if (field.type === 'boolean') {
      return { ok: true, value: false }
    }
    return { ok: true, value: null }
  }

  switch (field.type) {
    case 'number': {
      const n = Number(raw)
      if (!Number.isFinite(n)) {
        return { ok: false, error: `${field.label} sayı olmalı.` }
      }
      if (field.min !== undefined && n < field.min) {
        return { ok: false, error: `${field.label} en az ${field.min} olmalı.` }
      }
      if (field.max !== undefined && n > field.max) {
        return { ok: false, error: `${field.label} en fazla ${field.max} olmalı.` }
      }
      return { ok: true, value: Math.round(n) }
    }

    case 'boolean': {
      return { ok: true, value: raw === true || raw === 'true' || raw === 1 || raw === '1' }
    }

    case 'tags': {
      const list = Array.isArray(raw)
        ? raw.map(String)
        : String(raw).split(',')
      const cleaned = list.map(s => s.trim()).filter(Boolean)
      return { ok: true, value: cleaned }
    }

    default: {
      const s = String(raw)
      if (field.maxLength && s.length > field.maxLength) {
        return { ok: false, error: `${field.label} en fazla ${field.maxLength} karakter olmalı.` }
      }
      if (field.type === 'select' && field.options && !field.options.includes(s)) {
        return { ok: false, error: `${field.label} için geçersiz değer: ${s}` }
      }
      if (field.type === 'url' && s && !/^(https?:\/\/|\/)/.test(s)) {
        return { ok: false, error: `${field.label} http(s):// veya / ile başlamalı.` }
      }
      return { ok: true, value: s }
    }
  }
}

export type BuildResult
  = | { ok: true, payload: Record<string, unknown> }
    | { ok: false, error: string }

/**
 * Istek govdesinden DB'ye yazilacak nesneyi uretir.
 * `partial` = PATCH (yalnizca gonderilen alanlar); degilse POST (zorunlular kontrol edilir).
 */
export function buildPayload(
  resource: ResourceDef,
  body: Record<string, unknown>,
  partial: boolean,
): BuildResult {
  const allowed = new Set(writableFieldNames(resource, partial ? 'update' : 'insert'))
  const payload: Record<string, unknown> = {}

  for (const field of resource.fields) {
    if (!allowed.has(field.name)) {
      continue
    }
    if (!Object.hasOwn(body, field.name)) {
      continue
    }
    const result = coerce(field, body[field.name])
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    if (result.value !== undefined) {
      payload[field.name] = result.value
    }
  }

  if (!partial) {
    for (const field of resource.fields) {
      if (!field.required) {
        continue
      }
      if (!(field.name in payload)) {
        return { ok: false, error: `${field.label} zorunlu.` }
      }
    }

    // Slug bos birakildiysa basliktan uret
    if (resource.autoSlugFrom && !payload.slug) {
      const source = payload[resource.autoSlugFrom]
      if (typeof source === 'string' && source.trim()) {
        payload.slug = slugify(source)
      }
    }
  }

  if (Object.keys(payload).length === 0) {
    return { ok: false, error: 'Güncellenecek alan yok.' }
  }

  return { ok: true, payload }
}

/**
 * PostgREST hata yardimcilari artik `lib/postgrest.ts`'te — admin'e ozel
 * degiller ve iletisim route'u da kullaniyor. Buradan yeniden disa aktariliyor
 * ki mevcut import'lar (`@/lib/admin/data`) calismaya devam etsin.
 */
export { isMissingColumnError, missingColumnFrom } from '@/lib/postgrest'

export interface WriteResult {
  ok: boolean
  data?: unknown
  error?: string
  /** Sema uyusmazligi yuzunden disarida birakilan alanlar */
  droppedColumns?: string[]
}

/**
 * Insert/update yapar; semada OLMAYAN bir kolon yuzunden duserse o kolonu
 * cikarip tekrar dener (en fazla 3 kez).
 *
 * Neden: `messages.phone` gercekten yoktu ve iletisim formu mesajlari bu yuzden
 * sessizce kayboluyordu. Burada ayni tuzaga bir daha dusmuyoruz — hangi alanin
 * atlandigini da acikca donduruyoruz ki panelde kullaniciya soyleyebilelim.
 */
export async function writeWithColumnFallback(
  table: string,
  payload: Record<string, unknown>,
  mode: 'insert' | 'update',
  match?: { column: string, value: string | number },
  select = '*',
): Promise<WriteResult> {
  const db = adminDb()
  if (!db) {
    return { ok: false, error: 'Supabase yapılandırılmamış (service_role eksik).' }
  }

  const working: Record<string, unknown> = { ...payload }
  const dropped: string[] = []

  for (let attempt = 0; attempt < 4; attempt++) {
    const query = mode === 'insert'
      ? db.from(table).insert(working).select(select)
      : db.from(table).update(working).eq(match!.column, match!.value).select(select)

    const { data, error } = await query

    if (!error) {
      return { ok: true, data: Array.isArray(data) ? data[0] : data, droppedColumns: dropped }
    }

    const missing = missingColumnFrom(error)
    if (missing && Object.hasOwn(working, missing)) {
      console.warn(`[admin/data] ${table}.${missing} kolonu yok — alan atlandı (${error.code}).`)
      delete working[missing]
      dropped.push(missing)
      if (Object.keys(working).length === 0) {
        return { ok: false, error: 'Kaydedilecek geçerli alan kalmadı.', droppedColumns: dropped }
      }
      continue
    }

    console.error(`[admin/data] ${mode} basarisiz (${table}):`, error.code, error.message)
    return { ok: false, error: `${error.code || ''} ${error.message}`.trim(), droppedColumns: dropped }
  }

  return { ok: false, error: 'Kayıt denemesi başarısız oldu.', droppedColumns: dropped }
}
