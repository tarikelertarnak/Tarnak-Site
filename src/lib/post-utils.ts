import type { BlogPost } from '@/lib/content'

/**
 * Okuma süresi + TIL etiketi yardımcıları (Faz 4 · 3)
 *
 * `TIL` = "Today I Learned" — kısa, tek konulu öğrenme notları. Uzun
 * yazılardan AYRI bir türdür; kullanıcı bunları birbirine karıştırmasın.
 * (Tür `BlogPost.kind` alanında tutulur; aşağıdaki yardımcılar onu okur.)
 */

/** Tür tespiti: `kind` alanı varsa ona, yoksa etiketlere bakarak. */
export function postKind(
  post: Pick<BlogPost, 'kind' | 'tags' | 'badge'>,
): 'til' | 'article' {
  if (post.kind === 'til')
return 'til'
  const etiketler = (post.tags ?? []).map(t => t.toLowerCase())
  if (etiketler.includes('til') || etiketler.includes('t-i-l'))
return 'til'
  return 'article'
}

/**
 * Okuma süresi (dakika).
 *
 * 225 kelime/dakika — okuma hızı araştırmalarının ortalama değeri (teknik
 * Türkçe metin için biraz yüksek ama makul). Noktalama ve kısa kelimeler
 * için bir düzeltme yapılmıyor; basit ve tahmin edilebilir kalması tercih
 * edildi (kullanıcı yanlış kesinlik görmesin).
 *
 * Türkçe'de 1 kelime ≈ 1.15 token; kelime sayısı zaten kelime sayısı olduğu
 * için ek düzeltme gerekmiyor.
 */
export function readingMinutes(content: string): number {
  const duz = content
    // Kod blokları okuma hızını etkilemez (okunmuyor, çalıştırılıyor).
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, ' ')
    .trim()

  const kelimeler = duz ? duz.split(/\s+/).filter(Boolean).length : 0
  return Math.max(1, Math.round(kelimeler / 225))
}

/**
 * İlgili yazılar: aynı etiketleri paylaşan, EN YENİ yazılar.
 *
 * @param current okuduğumuz yazı
 * @param all     tüm yazılar
 * @param limit   en fazla kaç tane
 *
 * Puanlama: etiket başına +3, aynı tür (TIL/uygulama) +2, yakın tarih +1.
 * Böylece hem etiket hem konu yakınlığı hesaba katılır.
 */
export function relatedPosts(
  current: Pick<BlogPost, 'id' | 'slug' | 'tags' | 'date' | 'kind'>,
  all: BlogPost[],
  limit = 3,
): BlogPost[] {
  const benimEtiketlerim = new Set(
    (current.tags ?? []).map(t => t.toLowerCase()),
  )
  if (benimEtiketlerim.size === 0) {
    // Etiket yoksa en yeni yazılardan göster (boş ekrandan iyi).
    return all
      .filter(p => p.id !== current.id)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit)
  }

  const benimTarih = new Date(current.date).getTime()
  const benimTur = postKind(current)

  return all
    .filter(
      p => p.id !== current.id && (p.slug ?? '') !== (current.slug ?? ''),
    )
    .map((p) => {
      let puan = 0
      for (const t of p.tags ?? []) {
        if (benimEtiketlerim.has(t.toLowerCase()))
puan += 3
      }
      if (postKind(p) === benimTur)
puan += 2
      const fark = Math.abs(new Date(p.date).getTime() - benimTarih)
      if (fark < 1000 * 60 * 60 * 24 * 90)
puan += 1
      return { p, puan }
    })
    .filter(x => x.puan > 0)
    .sort((a, b) => b.puan - a.puan || b.p.date.localeCompare(a.p.date))
    .slice(0, limit)
    .map(x => x.p)
}
