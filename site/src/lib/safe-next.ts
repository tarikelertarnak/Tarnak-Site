/**
 * `?next=` güvenli hedef çözümleyici.
 *
 * Kullanıcı isteği (2026-10-11): "giriş yaptımda otomatik chat url'ine dönmeli".
 * `/login` ve `/sign` bu değeri okuyup giriş sonrası oraya yönlendiriyor.
 *
 * GÜVENLİK — açık yönlendirme (open redirect) engeli:
 *   · yalnızca site içi, kök-relative yollar kabul edilir (`/chat`).
 *   · `//evil.com`, `http://…`, `javascript:` gibi şemalar ve protokol-göreli
 *     adresler REDDEDİLİR (aksi halde saldırgan `?next=https://kotu-site`
 *     ile kullanıcıyı phishing'e atardı).
 *   · bozuk/geçersizse varsayılan (`/`) kullanılır.
 */

/** Site içi, kök-relative tek sayfa yolu mu? (`/chat`, `/chat/`, `/admin`) */
export function safeNext(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) {
    return fallback
  }
  // `//host` → protokol-göreli (open redirect) ; `/\host` → bazı tarayıcılar
  // bunu da `\` ile yorumlar. İkisi de reddedilir.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return fallback
  }
  // protokol/şema içeren her şeyi reddet (`https:`, `data:` vb. zaten '/' ile
  // başlamıyor ama savunma katmanı).
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    return fallback
  }
  return raw
}
