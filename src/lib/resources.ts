import { z } from 'zod'

/**
 * Kaynaklar (Faz 4 · 4)
 *
 * `/kaynaklar` sayfasının veri modeli. Kategorili araç/link listesi
 * kullanıcının "faydalı bulduğum şeyler" listesi gibi düşünüldü.
 *
 * ⚠️ İÇERİK UYDURULMADI (ortak kural): aşağıdaki kaynaklar
 * `data/content.json` içinde `resources` anahtarıyla yaşar ve ŞU AN boş
 * geliyorsa sayfa boş durum ekranı gösterir. Kategori başlığı, açıklama
 * ve linkler kullanıcı tarafından doldurulacak.
 *
 * Zod şeması iki işe yarar:
 *  1) Admin panelinde form doğrulaması
 *  2) Bozuk veri build'i düşürmesin diye (zod hata verirse sayfa boş
 *     listeye düşer, site çalışmaya devam eder)
 */

export const resourceSchema = z.object({
  /** Kategori adı — başlık olarak görünür ("Araçlar", "Öğrenme", …) */
  title: z.string().min(1, 'Kategori adı boş olamaz').max(80),
  /** Kategori altı kısa açıklama (isteğe bağlı) */
  description: z.string().max(240).optional(),
  /** Kategori içindeki bağlantılar */
  items: z.array(z.object({
    name: z.string().min(1, 'Bağlantı adı boş olamaz').max(80),
    /** Site içi yol (`/blog`) ya da tam URL (`https://…`) */
    href: z.string().min(1).max(500),
    /** Tek cümlelik ne işe yaradığı. Uydurma olmasın diye boş bırakılabilir. */
    note: z.string().max(200).optional(),
  })).default([]),
  /** Kategori sırası (küçük = üstte) */
  order: z.number().int().min(0).max(999).default(100),
})

export const resourcesSchema = z.object({
  title: z.string().min(1).default('Kaynaklar'),
  subtitle: z.string().max(200).optional(),
  /** Kategori listesi */
  groups: z.array(resourceSchema).default([]),
  /** Sayfa açıklaması (SEO description) */
  description: z.string().max(300).optional(),
})

export type ResourceGroup = z.infer<typeof resourceSchema>
export type Resources = z.infer<typeof resourcesSchema>

/**
 * Veriyi güvenle okur. Bozuk/eksik veri build'i DÜŞÜRMEZ —
 * kullanıcının yarım bıraktığı içerik yüzünden site erişilemez olmaz.
 */
export function parseResources(input: unknown): Resources {
  const sonuc = resourcesSchema.safeParse(input)
  if (!sonuc.success) {
    // Sunucu tarafında log'a düş, kullanıcıya gösterme.
    console.warn('[resources] şema doğrulaması başarısız, boş liste kullanılıyor:', sonuc.error.issues[0]?.message)
    return resourcesSchema.parse({})
  }
  return {
    ...sonuc.data,
    groups: sonuc.data.groups.slice().sort((a, b) => a.order - b.order),
  }
}

/** Site içi yol mu, dış URL mi? (dış linkler yeni sekmede açılmalı) */
export function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href)
}