'use client'

/**
 * ThemedBackground — the fixed background behind the entire page.
 * Color does NOT depend on React state: the bg-white dark:bg-black classes
 * switch instantly via CSS according to the .dark/.light class on <html>.
 * ThemeInitScript prints the class at parse-time, so the first paint is the correct color — no FOUC.
 */

export function ThemedBackground({
  backgroundImage,
}: {
  backgroundImage: string
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[-1] bg-white dark:bg-black"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
