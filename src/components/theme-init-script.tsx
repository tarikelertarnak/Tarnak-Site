/**
 * ThemeInitScript — prints a parse-time inline script into head to prevent
 * FOUC (flash of unstyled content). The script runs as soon as HTML is parsed
 * (BEFORE React hydration and first paint): it sets the .dark/.light class
 * on <html> plus body colors, according to the localStorage/system preference.
 *
 * All theme-sensitive layers (body, ThemedBackground, bg-text utilities)
 * depend on CSS classes, so colors render correctly without waiting for React state.
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
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch(e) {
    var r = document.documentElement;
    r.classList.add('dark'); r.classList.remove('light');
    r.style.colorScheme = 'dark';
  }
})();
`

export function ThemeInitScript({ defaultTheme }: { defaultTheme: string }) {
  // React 19 hoists the script to head and runs it when it is first added to the DOM.
  // body may not be parsed yet → the script null-checks body.
  return (
    <script
      id="theme-init"
      // the loop variable is used inside the script scope — it comes from SSR, a fixed XSS-free enum.
      dangerouslySetInnerHTML={{ __html: `var defaultTheme='${defaultTheme}';\n${SCRIPT}` }}
    />
  )
}
