/**
 * Panoya kopyalama — modern API + guvenli geri donus (fallback).
 *
 * Neden fallback: `navigator.clipboard` yalnizca GUVENLI BAGLAMDA
 * (https veya localhost) bulunur. Site HTTP uzerinden veya eski bir
 * tarayicida acilirsa `navigator.clipboard` `undefined` olur ve kopyala
 * butonu sessizce calismazdi. Bu yuzden gizli bir textarea + `execCommand`
 * ile ikinci bir yol deniyoruz.
 *
 * Fonksiyon ASLA throw etmez; basarili/basarisiz bilgisini boolean doner.
 * Cagiran taraf kullaniciya "Kopyalandi" / "Kopyalanamadi" diyebilsin diye
 * hatayi yutmak yerine sonucu bildiriyoruz.
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) {
    return false
  }

  // 1) Modern Clipboard API (guvenli baglam gerekir)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  }
  catch {
    // Izin reddedilmis / belge odakta degil → fallback'e dus
  }

  // 2) Fallback: gizli textarea + execCommand('copy')
  try {
    if (typeof document === 'undefined') {
      return false
    }
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    // Gorusun disinda tut ama `display:none` YAPMA — o durumda secilemez.
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    area.style.left = '-1000px'
    area.style.opacity = '0'
    document.body.appendChild(area)

    area.select()
    area.setSelectionRange(0, text.length)

    const ok = typeof document.execCommand === 'function'
      ? document.execCommand('copy')
      : false

    area.remove()
    return Boolean(ok)
  }
  catch {
    return false
  }
}
