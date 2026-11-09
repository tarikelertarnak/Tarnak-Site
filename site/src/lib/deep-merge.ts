/**
 * İçerik katmanları için derin birleştirme (2026-10-31).
 *
 * NEDEN: `getContent()` paket içeriği (`data/content.json`) taban, Supabase
 * satırını onun üzerine binen katman sayıyor. Ama birleştirme TEK SEVİYE
 * derinlikteydi (`{ ...bundled, ...parsed }`) → satırda VAR OLAN her üst düzey
 * anahtar paketin tamamını eziyordu.
 *
 * Ölçülen gerçek hata: satır `phase6` taşıyor ama içinde yalnız `privacy` ve
 * `kvkk` var. Bu yüzden koda eklenen `phase6.now` hiç görünmedi ve hukuki
 * başlıklar satırdaki eski Türkçe metinde takılı kaldı.
 *
 * Kural: düz nesneler RECURSIVE birleşir (satır kazanır), diziler ve ilkel
 * değerler TAMAMEN üstteki katmandan gelir (kısmi dizi birleştirme yok —
 * admin "3 maddeyi 2'ye indirdim" dediğinde eski 3. madde geri sızmamalı).
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * `overlay` değerlerini `base` üzerine derin birleştirir.
 *
 * @returns yeni nesne; girdiler DEĞİŞTİRİLMEZ.
 */
export function deepMergeContent<T>(base: T, overlay: unknown): T {
  if (overlay === undefined)
    return base
  if (!isPlainObject(base) || !isPlainObject(overlay))
    return overlay as T

  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    if (value === undefined)
      continue
    const current = out[key]
    out[key] = isPlainObject(current) && isPlainObject(value)
      ? deepMergeContent(current, value)
      : value
  }
  return out as T
}
