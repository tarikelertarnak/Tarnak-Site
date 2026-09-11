/** URL-safe page name: lowercase, digits, dash, underscore. (No fs — also used on the client) */
export function normalizePage(page: string): string {
  const clean = (page || 'home').replace(/[^a-z0-9-_]/gi, '').toLowerCase()
  return clean || 'home'
}