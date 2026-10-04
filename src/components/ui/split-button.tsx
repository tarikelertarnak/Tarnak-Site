/**
 * Split button — iki eylemi tek buton gibi gosteren birlestirilmis yapi.
 *
 * Sorun: "Indir" + acilir liste (combobox) ve "CV" + "Goruntule" gibi
 * ciftler once iki ayri buton gibi duruyordu. Kullanici istegi: aralarinda
 * sadece ince bir ayirici cizgi olsun, ORTA KOSE YUVARLATILMASIN.
 *
 * Cozum: yuvarlatma ve tasma `SPLIT_WRAP`'te. Cocuklar kendi radiuslarini
 * almaz; birlestig ic kose parent tasmasina birakilir ve DUZ kalir, dis
 * koseler yuvarlak gorunur. Ayirici `SPLIT_DIVIDER` = ince `border-l`.
 *
 * Neden sinif sabiti, bilesen degil: iki kullanim yeri var (project-card
 * indirme, cv-picker) ama yari eylemlerin ETIKETI farkli — biri `<a>`
 * (`Indir`), digeri `<button>` (aciliyor) veya LobeButton. Ortak bir
 * bilesen ikisini de zorlamak icin `as`/kutu API'si isterdi; uc kullanim
 * daha az kod demek. Icerik ve semantik cagrida kalir, yalnizca yuvarlatma +
 * ayirici kurali paylasilir.
 *
 * Yukseklik 40px = paylasilan `Button` tabaninin `!h-10` degeriyle ayni
 * (bkz. button.tsx). Iki boy birbirinden ayrilirsa split buton kutuyla
 * ayni hizada durmaz.
 */

/** Sarmalayici: tek yuvarlak kutu, iki yariyi birbirine yapistirir. */
export const SPLIT_WRAP
  = 'inline-flex h-10 items-stretch overflow-hidden rounded-lg bg-primary'

/** Her yari: ayni yukseklik + tipografi. Radius YOK (wrap hallediyor). */
export const SPLIT_PART
  = 'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap px-3 text-sm font-medium text-white no-underline transition-colors hover:bg-primary/90 dark:hover:bg-primary/80'

/** Sag yari: ince ayirici cizgi + sabit genislik (ikon icin yer). */
export const SPLIT_DIVIDER = 'w-10 border-l border-white/25 px-0'