import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

/**
 * Converts Markdown to HTML and sanitizes it against XSS.
 * Safe rendering for blog posts and GitHub READMEs.
 */
export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string
  return sanitizeHtml(rawHtml, {
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
  })
}