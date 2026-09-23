/**
 * PostgREST hata yardimcilari — admin'e ozel DEGIL, her route kullanabilir.
 *
 * Neden ayri dosya: bu mantik bir kez `lib/admin/data.ts` icinde kalmisti ve
 * iletisim route'u ayni isi ELLE yapmaya calisti (`error.code === '42703'`).
 * Ama PostgREST eksik kolonu tek bir kodla bildirmiyor:
 *
 *   - `42703`     → Postgres'in kendi hatasi: "column x.y does not exist"
 *   - `PGRST204`  → PostgREST sema onbellegi hatasi:
 *                   "Could not find the 'phone' column of 'messages' in the
 *                    schema cache"
 *
 * Iletisim formu yalnizca `42703`'u kontrol ettigi icin gercek kod olan
 * `PGRST204`'u HIC yakalayamadi → `messages.phone` yokken telefonla gonderilen
 * mesajlar 500 ile geri donuyordu ve KAYBOLUYORDU. Tek bir yerde tutmak
 * bu sinifta hatayi tekrar etmesini engeller.
 */

export interface PostgrestLikeError {
  code?: string
  message?: string
}

/** Bu hata "semada olmayan kolon" hatasi mi? */
export function isMissingColumnError(error: PostgrestLikeError | null | undefined): boolean {
  return error?.code === '42703' || error?.code === 'PGRST204'
}

/**
 * Hata mesajindan eksik kolon adini cikarir; baska hata kodunda `null` doner
 * (yanlis kolonu dusurmeyelim).
 */
export function missingColumnFrom(error: PostgrestLikeError): string | null {
  if (!isMissingColumnError(error)) {
    return null
  }
  // 42703: "column messages.phone does not exist"
  const match = /column\s+[^.]+\.([a-z0-9_]+)\s+does not exist/i.exec(error.message || '')
  if (match) {
    return match[1]
  }
  // PGRST204: "Could not find the 'phone' column of 'messages' in the schema cache"
  const alt = /Could not find the '([a-z0-9_]+)' column/i.exec(error.message || '')
  return alt ? alt[1] : null
}
