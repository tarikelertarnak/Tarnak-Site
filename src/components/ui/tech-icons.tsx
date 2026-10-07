/**
 * Teknoloji ikonları (2026-10-06, kullanıcı: "her teknolojinin önünde
 * şu an genel link ikonu var; bunun yerine her teknolojinin KENDİ ikonu
 * olsun").
 *
 * Neden harici paket DEĞİL: react-icons/simple-icons eklemek ~300 KB
 * bağımlılık demek. Sitede gösterilecek teknoloji sayısı sabit ve az
 * (HTML, CSS, JS, C#, Python, SQL, React, Node, …) — hepsi için küçük bir
 * SVG yolu elle yazmak daha küçük ve temiz. İkon bulunamazsa çağıran yer
 * genel kod ikonuna düşer.
 *
 * Hepsi `currentColor` ile çizilir → tema rengini ve `group-hover`
 * mavi geçişini otomatik devralır (glow/gölge yok).
 */
import type { ReactNode } from 'react'

const S = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'currentColor' } as const

/** Etiket (küçük harf, ikon adı) → SVG. Anahtar `label.toLowerCase()`. */
export const TECH_ICONS: Record<string, ReactNode> = {
  html: (
    <svg {...S} aria-hidden="true"><path d="M1.5 1h21l-1.91 21.56L12 24l-8.59-1.44L1.5 1Zm7.1 16.4h6.8l.76-8.47h-4.1v-.7h5.6l.15-1.7H9.2v-.7h9.18l-.15 1.7h-2.6v.7h4.1l-1.27 13.72h-6.1L8.6 17.4Zm3.4-7.4h1.9l-.08 8.8h-1.72l-.1-8.8Z" /></svg>
  ),
  css: (
    <svg {...S} aria-hidden="true"><path d="M3 1h18l-1.64 14.7L12 19.5l-7.36-3.8L3 1Zm13.9 4.3h-9.8l.28 2.5h9.24l-.16 1.6H7.2l.3 2.5h9.02l-.32 2.6L12 15.4l-4.2-1.4-.2-1.6H12v-.75H5.5L5.1 5.3h11.2L15.9 4Z" /></svg>
  ),
  javascript: (
    <svg {...S} aria-hidden="true"><path d="M2 1h20v22H2V1Zm10.9 8.5v6.2c0 1.1-.5 1.8-1.6 1.8-1 0-1.5-.5-1.6-1.3H8.3c0 1.8 1.4 2.8 2.9 2.8 1.7 0 3-1 3-3.3V9.5H12v-.05h.9Zm4.2 3.3c0-.8.5-1.2 1.2-1.2.8 0 1.2.5 1.2 1.5h1.5c0-2-1.3-3.1-2.7-3.1-1.6 0-2.7 1.1-2.7 2.9v2c0 1.9 1.1 3 2.7 3 1.5 0 2.7-1.1 2.7-3.1v-.8h-1.5v.7c0 1-.4 1.5-1.2 1.5s-1.2-.4-1.2-1.3v-2.1Z" /></svg>
  ),
  'c#': (
    <svg {...S} aria-hidden="true"><path d="M12 1.5 3.8 5.6v11.8L12 21.5l8.2-4.1V5.6L12 1.5Zm0 2.2 6.2 3.1v6.4l-2.6 1.3V9.9L12 7.7l-3.6 2.2v5.6l-2.5-1.2V6.8L12 3.7ZM8.4 10.4l1.9-.9v2.5l-1.9.9v-2.5Zm4.1-2.1 1.9 1v2.3l-1.9.9V8.3Z" /></svg>
  ),
  '.net': (
    <svg {...S} aria-hidden="true"><path d="M12 1.5 3.8 5.6v11.8L12 21.5l8.2-4.1V5.6L12 1.5Zm0 2.2 6.2 3.1v6.4l-2.6 1.3V9.9L12 7.7l-3.6 2.2v5.6l-2.5-1.2V6.8L12 3.7Z" /></svg>
  ),
  python: (
    <svg {...S} aria-hidden="true"><path d="M12 2c-2.2 0-4 .3-4 2v2h4.1v.9H6.4C4.6 7 3.4 8 3.4 10.5c0 2.3 1.1 3.4 2.8 3.4h1.4v-2c0-2.1 1.8-3.9 3.9-3.9h3c1.8 0 3.1-1.4 3.1-3V4c0-1.4-1.3-2-3-2H12Zm-2.4 1.3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8ZM12 22c2.2 0 4-.3 4-2v-2h-4.1v-.9h5.7c1.8 0 3-1 3-3.5C20.6 11.3 19.5 10.1 17.8 10.1h-1.4v2c0 2.1-1.8 3.9-3.9 3.9h-3C7.7 16 6.4 17.4 6.4 19v2c0 1.4 1.3 1 3 1h5.6Zm2.4-1.2a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" /></svg>
  ),
  sql: (
    <svg {...S} aria-hidden="true"><path d="M12 2c5 0 9 1.3 9 3v14c0 1.7-4 3-9 3s-9-1.3-9-3V5c0-1.7 4-3 9-3Zm0 2c-3.9 0-7 .9-7 1s3.1 1 7 1 7-.9 7-1-3.1-1-7-1Zm-7 4.5V18c0 .1 3.1 1 7 1s7-.9 7-1V8.5c-1.7.7-4.3 1-7 1s-5.3-.3-7-1Z" /></svg>
  ),
  database: (
    <svg {...S} aria-hidden="true"><path d="M12 2c-4.4 0-8 1.3-8 3s3.6 3 8 3 8-1.3 8-3-3.6-3-8-3Zm8 5.5V12c0 1.7-3.6 3-8 3s-8-1.3-8-3V7.5C5.7 8.3 8.7 8.6 12 8.6s6.3-.3 8-1.1ZM12 10.6c-3.9 0-7-.8-7-1v2c0 .2 3.1 1 7 1s7-.8 7-1v-2c0 .2-3.1 1-7 1Zm0 5.4c-3.9 0-7-.8-7-1v2c0 1.7 3.1 3 7 3s7-1.3 7-3v-2c0 .2-3.1 1-7 1Z" /></svg>
  ),
  react: (
    <svg {...S} aria-hidden="true"><path d="M12 10.1a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Zm0 1.5a.4.4 0 1 1 0 .8.4.4 0 0 1 0-.8Zm-2.4 5.6c-3.5 0-6.4 1.1-6.4 2.5s2.9 2.5 6.4 2.5c2 0 3.7-.4 4.9-1a13 13 0 0 1-1.6-3.9c-.6.2-1.2.4-1.9.4-.5 0-1-.1-1.4-.5Zm4.8 0c-.4.4-.6.5-1.4.5-.7 0-1.3-.2-1.9-.4-.5 1.4-1 2.7-1.6 3.9 1.2.6 2.9 1 4.9 1 3.5 0 6.4-1.1 6.4-2.5S17.9 17.2 14.4 17.2ZM5.2 13.3c-.4-.7-.7-1.5-1-2.3.3-.8.6-1.6 1-2.3-.3 0-.7-.1-1.1-.1-1 0-1.9.1-1.9.4s.9.4 1.9.4c.4 0 .8 0 1.1-.1Zm5.4-1.1c0-2.3.2-4.2.5-5.6C10 6.5 9 6.4 7.9 6.4c-3.5 0-6.4 1.1-6.4 2.5s2.9 2.5 6.4 2.5c1.1 0 2.1-.1 2.8-.2Zm-2.3-4.7c.1 1.4.2 3.3.2 5.8s-.1 4.4-.2 5.8c.7.1 1.7.2 2.8.2 1 0 1.9-.1 1.9-.4s-.9-.4-1.9-.4c-.4 0-.8 0-1.1-.1.4-.7.7-1.5 1-2.3-.3-.8-.6-1.6-1-2.3.3 0 .7-.1 1.1-.1.3 0 .5 0 .7.1l.6-4.2c-1-.4-2.2-.6-3.6-.6Zm5.9.1c1.9.2 3.4.7 4.3 1.3.6.4 1 .9 1 .9s-.9.4-2.8.4c-.7 0-1.5-.1-2.5-.1Zm2.3 8.4c.4-.7.7-1.5 1-2.3-.3-.8-.6-1.6-1-2.3.3 0 .7-.1 1.1-.1 1 0 1.9.1 1.9.4s-.9.4-1.9.4c-.4 0-.8 0-1.1-.1ZM7.9 21.6c-1.1 0-2-.1-2-.1s.9-.4 2.8-.4c.7 0 1.5.1 2.5.1Zm10.3-2.8c.1-1.4.2-3.3.2-5.8s-.1-4.4-.2-5.8c-.7-.1-1.7-.2-2.8-.2-1 0-1.9.1-1.9.4s.9.4 1.9.4c.4 0 .8 0 1.1.1-.4.7-.7 1.5-1 2.3.3.8.6 1.6 1 2.3-.3 0-.7.1-1.1.1-.5 0-.5 0-.7-.1l-.6 4.2c1 .4 2.2.6 3.6.6 1.1 0 2 .1 2 .1s-.9.4-2.8.4c-.7 0-1.5-.1-2.5-.1-.4 0-1.4 0-2.5.1Zm4.7 1.4c.7-.1 1.3-.2 1.3-.2s-.9-.4-2.8-.4c-.7 0-1.5.1-2.5.1Z" /></svg>
  ),
  'next.js': (
    <svg {...S} aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.4 0 2.7-.3 3.9-.8L7.8 11.3v9.4A8 8 0 0 1 4 12a8 8 0 0 1 8-8 8 8 0 0 1 6.5 3.3l1.6-1.5A9.9 9.9 0 0 0 12 2Zm3.7 3.7h1.7v11h-1.7V5.7Z" /></svg>
  ),
  'nextjs': (
    <svg {...S} aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.4 0 2.7-.3 3.9-.8L7.8 11.3v9.4A8 8 0 0 1 4 12a8 8 0 0 1 8-8 8 8 0 0 1 6.5 3.3l1.6-1.5A9.9 9.9 0 0 0 12 2Zm3.7 3.7h1.7v11h-1.7V5.7Z" /></svg>
  ),
  node: (
    <svg {...S} aria-hidden="true"><path d="M12 1.9 3.4 6.6v9.9L12 21.2l8.6-4.7V6.6L12 1.9Zm.7 3.1 6.2 3.4-2.8 1.5-3.4-1.9V5Zm-1.4 0v7l-3.1 1.7V8.4L11.3 5Zm-6.6 5 2.6-1.4 3.1 1.7v3.4l-5.7-3.1V10Zm6.6 5.1v-2.2l3.1-1.7 3.1 1.7-6.2 3.4v-1.2Zm7.7-2.2v-3.4l2.3-1.3v3.1l-2.3 1.6Z" /></svg>
  ),
  typescript: (
    <svg {...S} aria-hidden="true"><path d="M2 1h20v22H2V1Zm4.4 6.2v9.5h1.9v-9.5H6.3v1.9h1.7v1H5.2v-1.9h1.1V7.2H6.3Zm5.8 1.6c.4-.3.9-.4 1.6-.4 1.4 0 2.2.6 2.2 1.8v6.5h-1.8v-.9c-.3.6-.9 1-1.7 1-.5 0-.9-.2-1.2-.5-.3-.3-.4-.7-.4-1.3 0-1.2.9-1.9 2.7-1.9h.5v-.3c0-.6-.4-.9-1-.9-.5 0-.9.2-1.1.5l-.8-.9Zm1.9 4c0 .5.3.8.8.8s.8-.3.8-.9v-.4h-.6c-.6 0-1 .2-1 .5Zm4.1-4.5h4.9v1.7h-1.6v7.8h-1.7V9h-1.6V7.3Z" /></svg>
  ),
  'c++': (
    <svg {...S} aria-hidden="true"><path d="M2 1h20v22H2V1Zm6.2 6.4v1.5h-.9c-.7 0-1 .4-1 1.2v.5c0 .8.3 1.2 1 1.2h.9v1.5h-1c-1.5 0-2.2-.8-2.2-2.3v-.8c0-1.5.7-2.3 2.2-2.3h1Zm3.7 0v1.5h-.9c-.7 0-1 .4-1 1.2v.5c0 .8.3 1.2 1 1.2h.9v1.5h-1c-1.5 0-2.2-.8-2.2-2.3v-.8c0-1.5.7-2.3 2.2-2.3h1Zm4.5.7h1.4l.9 1.7.9-1.7h1.4l-1.6 2.3 1.6 2.4h-1.4l-.9-1.8-1 1.8h-1.3l1.6-2.4-1.6-2.3Z" /></svg>
  ),
}

/**
 * Etiketten ikon çözer. Bulunamazsa `null` döner — çağıran genel kod
 * ikonuna düşer (kullanıcı kuralı).
 */
export function techIcon(label: string): ReactNode | null {
  const k = label.trim().toLowerCase()
  if (TECH_ICONS[k]) return TECH_ICONS[k]
  // "HTML5", "CSS3", "JS" gibi sürüm ekli etiketler
  const kok = k.replace(/[\d+.#]/g, '')
  if (TECH_ICONS[kok]) return TECH_ICONS[kok]
  if (k.includes('html')) return TECH_ICONS.html
  if (k.includes('css')) return TECH_ICONS.css
  if (k.includes('sql') || k.includes('database')) return TECH_ICONS.sql
  if (k.includes('python')) return TECH_ICONS.python
  if (k.includes('react')) return TECH_ICONS.react
  if (k.includes('next')) return TECH_ICONS['next.js']
  if (k.includes('node')) return TECH_ICONS.node
  if (k.includes('type')) return TECH_ICONS.typescript
  if (k.includes('csharp') || k.includes('c#') || k.includes('.net')) return TECH_ICONS['c#']
  if (k.includes('javascript') || k === 'js') return TECH_ICONS.javascript
  if (k.includes('c++')) return TECH_ICONS['c++']
  return null
}