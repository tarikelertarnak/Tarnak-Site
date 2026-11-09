/**
 * ThemeInitScript — prints a parse-time inline script into head to prevent
 * FOUC (flash of unstyled content). The script runs as soon as HTML is parsed
 * (BEFORE React hydration and first paint): it sets the .dark/.light class
 * on <html> plus body colors, according to the localStorage/system preference.
 *
 * All theme-sensitive layers (body, ThemedBackground, bg-text utilities)
 * depend on CSS classes, so colors render correctly without waiting for React state.
 *
 * Ayni zamanda `data-reduce-motion` tercihini de uygular — bu ayar React
 * baglandiktan sonra degil, parse aninda devreye girmelidir; aksi halde
 * sayfa yenilenince ayar kaybolur (bkz. SCRIPT icindeki not).
 *
 * 2026-10-30: ham `<script>` yerine `next/script` + `beforeInteractive`.
 * Sebep (kullanici bildirdi, konsol hatasi): React 19, bilesen agacinda
 * render edilen ciplak `<script>` etiketini istemci tarafinda gorunce
 * "Encountered a script tag while rendering React component" uyarisi
 * basiyor. `next/script` beforeInteractive stratejisi script'i yalnizca
 * sunucu HTML'ine (head, hydration'dan once) koyar; istemci React agacinda
 * script dugumu olusmaz → uyari kaybolur, FOUC korumasi aynen kalir.
 */

const SCRIPT = `
(function(){
  try {
    var root = document.documentElement;
    var t = localStorage.getItem('site-theme');
    var auto = t === 'auto' || t === 'system' || !t;
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = auto
      ? (defaultTheme === 'system' || defaultTheme === 'auto' ? systemDark : defaultTheme === 'dark')
      : t === 'dark';
    root.classList.toggle('dark', dark);
    root.classList.toggle('light', !dark);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.style.colorScheme = dark ? 'dark' : 'light';

    // "Animasyonlari azalt" tercihi.
    // ⚠️ Bu satir olmadan ayar SAHTEYDI: yalnizca kullanici anahtari
    // cevirdiginde data-reduce-motion set ediliyordu, sayfa yenilenince
    // attribute kayboluyor ve animasyonlar geri geliyordu. Ayar artik
    // parse aninda (React'ten once) uygulaniyor — tema gibi kalici.
    if (localStorage.getItem('site-reduce-motion') === 'true') {
      root.setAttribute('data-reduce-motion', 'true');
    }

    // Cihaz sınıfı (2026-11-08, Ayarlar / İzinler): phone/tablet/desktop/tv.
    // CSS cihaz uyarlamaları html[data-device=...] üzerinden türer.
    try {
      var ua = (navigator.userAgent || '').toLowerCase();
      var device = 'desktop';
      var tvUa = /(?:tizen|web0s|smart-tv|smarttv|hbbtv|netcast|aft|mitv-browser)/;
      if (tvUa.test(ua)) device = 'tv';
      else if (window.innerWidth >= 2000) device = 'tv';
      else if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
        device = window.innerWidth < 768 ? 'phone' : 'tablet';
      }
      root.setAttribute('data-device', device);
    } catch (e) { /* cihaz algılanamazsa desktop kalır */ }
  } catch(e) {
    var r = document.documentElement;
    r.classList.add('dark'); r.classList.remove('light');
    r.setAttribute('data-theme', 'dark');
    r.style.colorScheme = 'dark';
  }
})();
`

export function ThemeInitScript({ defaultTheme, nonce }: { defaultTheme: string, nonce?: string }) {
  // `nonce` (2026-10-07): CSP nonce tabanlı politika için gerekli — nonce
  // olmadan bu satır içi script 'unsafe-inline' olmadan çalışır.
  // Kaynak: src/proxy.ts (x-nonce) → src/app/layout.tsx.
  //
  // next/script yerine doğrudan <script> kullanılıyor: Server Component'de
  // render edilen <script> SSR HTML'e yazılır, client'da hydrate olur ve
  // "Encountered a script tag while rendering React component" uyarısı alınmaz.
  return (
    <script
      id="theme-init"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: `var defaultTheme='${defaultTheme}';\n${SCRIPT}` }}
    />
  )
}
