/**
 * Admin dosya yükleme yardımcısı (2026-11-11).
 *
 * Medya ve link alanları aynı ucu kullanır: `POST /api/admin/upload`.
 * Geliştirme/Node hedeflerinde `public/uploads` altına yazar; Cloudflare
 * Workers'ta `fs` yok → orada çalışmaz (arka plan görseliyle aynı sınırlama).
 */
export async function uploadAdminFile(file: File): Promise<{
  ok: boolean
  url?: string
  message?: string
}> {
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = (await res.json()) as { success?: boolean, url?: string, message?: string }
    if (res.ok && data.success && data.url)
      return { ok: true, url: data.url }
    return { ok: false, message: data.message || 'Dosya yüklenemedi.' }
  }
  catch {
    return { ok: false, message: 'Dosya yüklenemedi.' }
  }
}
