import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

/**
 * TEK doğru politika: hangi etiket/nitelik/sema geçer.
 * Hem `renderMarkdown` hem `sanitizeRenderedHtml` bunu kullanır — ikisi
 * arasında izin listesi kaymasın (2026-10-07, içerik güvenliği).
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'hr',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'strong',
    'em',
    'b',
    'i',
    'u',
    's',
    'del',
    'mark',
    'a',
    'img',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'span',
    'div',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    code: ['class'],
    pre: ['class'],
    th: ['align'],
    td: ['align'],
    span: ['class'],
    div: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
    }),
  },
  // Block harmful protocols like javascript: in hrefs
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
}

/**
 * Converts Markdown to HTML and sanitizes it against XSS.
 * Safe rendering for blog posts.
 */
export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string
  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS)
}

/**
 * ZATEN HTML olan içeriği temizler (markdown'a çevirmeden).
 *
 * 2026-10-07 (içerik güvenliği): `GithubRepoView`, GitHub'ın
 * bize verdiği README HTML'ini `dangerouslySetInnerHTML` ile basıyordu —
 * markdown'a çevirmediği için TEMİZLENMİYORDU. README içinde
 * `<script>`, `onerror=` veya `javascript:` href'i varsa doğrudan çalışırdı
 * (XSS). Aynı izin listesi burada da uygulanıyor → tek doğru politika.
 *
 * Kullanım: `__html: sanitizeRenderedHtml(html)`
 */
export function sanitizeRenderedHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}
