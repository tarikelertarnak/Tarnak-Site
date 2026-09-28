/**
 * CV belgeleri — kaynak: Supabase `cvs` tablosu, fallback: content.about.cv.href.
 * Site tarafında tek kaynak; birden fazla kayıt varsa combobox gösterilir.
 */
import { cache } from 'react'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import bundledContentJson from '../../data/content.json'

export interface CvDoc {
  id: string
  label: string
  lang: string
  href: string
}

interface SiteShape {
  about?: { cv?: { href?: string } }
}

const bundled = bundledContentJson as unknown as SiteShape
const BUNDLED_HREF = bundled.about?.cv?.href ?? '/cv/tarikeler-cv.pdf'

/**
 * Aktif CV'ler, sıra numarasına göre. Supabase erişilemezse tek kayıt olarak
 * daima mevcut olan CV döner (site asla CV'siz kalmaz).
 *
 * Modül TTL: `cache()` per-request önbelleği; burası cross-request. 5 dakika
 * boyunca aynı sonuç döner — her istekte `cvs` tablosuna gitmez.
 */
const CV_CACHE_TTL_MS = 5 * 60 * 1000
let cvCache: { data: CvDoc[], at: number } | null = null

export const getCvs = cache(async (): Promise<CvDoc[]> => {
  if (cvCache && Date.now() - cvCache.at < CV_CACHE_TTL_MS) {
    return cvCache.data
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (url && key) {
    try {
      const sb = createSupabaseAdmin(url, key, { auth: { persistSession: false } })
      const { data, error } = await sb
        .from('cvs')
        .select('id, label, lang, href, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (!error && data && data.length > 0) {
        const docs = (data as Array<{ id: string, label: string, lang: string, href: string }>)
          .map(r => ({ id: r.id, label: r.label, lang: r.lang, href: r.href }))
        cvCache = { data: docs, at: Date.now() }
        return docs
      }
    }
    catch { /* fallback */ }
  }
  const fallback = [{ id: 'default', label: 'CV', lang: 'tr', href: BUNDLED_HREF }]
  cvCache = { data: fallback, at: Date.now() }
  return fallback
})
