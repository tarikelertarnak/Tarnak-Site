import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Kalicilik (persistence) oz-testi.
 *
 * NEDEN GEREKLI: icerik ve yonetici sifresi YALNIZCA yerel dosya sistemine
 * yaziliyor (`process.cwd()/data`). Production **Vercel** ve Vercel'de proje
 * dizini salt-okunurdur (`/tmp` disinda). Bu durumda yazim `EROFS` ile duser,
 * hata yutulur ve API yine de "Kaydedildi." der — kullanici kaydettigini
 * sanar, degisiklik KAYBOLUR.
 *
 * Bu modul "yazabiliyor muyum?" sorusunu **tahmin etmeden** yanitlar: gercekten
 * bir dosya yazip siler. Boylece panelde tek bakista gorulur.
 *
 * ⚠️ `fs.access(dir, W_OK)` KULLANILMAZ: o yalnizca izin bitlerine bakar ve
 * salt-okunur BAGLI (mount) bir dosya sisteminde de "yazilabilir" diyebilir.
 * Tek guvenilir test gercek bir yazma denemesidir.
 */

export interface PersistenceCheck {
  /** Icerik/ayar dosyalarinin yazildigi dizin */
  dataDir: string
  dataWritable: boolean
  /** Yuklenen gorsellerin yazildigi dizin */
  uploadsDir: string
  uploadsWritable: boolean
  /** Kalicilik calisiyor mu (ikisi de yazilabiliyorsa) */
  ok: boolean
  /** Kullaniciya gosterilecek kisa aciklama */
  note: string
}

/** Gercek yazma denemesi — izin bitlerine GUVENME, gercekten yaz. */
async function canWrite(dir: string): Promise<boolean> {
  const probe = path.join(dir, `.write-probe-${process.pid}-${Date.now()}`)
  try {
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(probe, 'ok', 'utf-8')
    await fs.unlink(probe)
    return true
  }
  catch {
    // Yazamadi — kalinti birakmamak icin sessizce temizlemeyi dene
    try {
      await fs.unlink(probe)
    }
    catch { /* zaten yok */ }
    return false
  }
}

export async function checkPersistence(): Promise<PersistenceCheck> {
  const dataDir = path.join(process.cwd(), 'data')
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')

  const [dataWritable, uploadsWritable] = await Promise.all([
    canWrite(dataDir),
    canWrite(uploadsDir),
  ])

  const ok = dataWritable && uploadsWritable

  let note: string
  if (ok) {
    note = 'Kalıcılık çalışıyor: içerik, şifre ve görsel yüklemeleri diske yazılabiliyor.'
  }
  else if (!dataWritable && !uploadsWritable) {
    note = 'Sunucu dosya sistemi SALT-OKUNUR (Vercel). İçerik/şifre kaydetme ve görsel yükleme KALICI DEĞİL — değişiklikler yeniden deploy sonrası kaybolur.'
  }
  else if (!dataWritable) {
    note = 'İçerik/şifre dizini yazılamıyor — kaydetme kalıcı değil.'
  }
  else {
    note = 'Görsel yükleme dizini yazılamıyor — yüklenen görseller kalıcı değil.'
  }

  return { dataDir, dataWritable, uploadsDir, uploadsWritable, ok, note }
}
