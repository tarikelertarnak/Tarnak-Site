/** URL-safe page name: lowercase, digits, dash, underscore. (No fs — also used on the client) */
export function normalizePage(page: string): string {
  const clean = (page || 'home').replace(/[^\w-]/g, '').toLowerCase()
  return clean || 'home'
}
