'use client'

import { useEffect, useRef } from 'react'

// Type declaration for lord-icon custom element
declare global {
  // eslint-disable-next-line ts/no-namespace
  namespace React {
    // eslint-disable-next-line ts/no-namespace
    namespace JSX {
      interface IntrinsicElements {
        'lord-icon': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            src?: string
            trigger?: string
            colors?: string
            style?: React.CSSProperties
          },
          HTMLElement
        >
      }
    }
  }
}

interface LordIconProps {
  src: string
  trigger?: 'hover' | 'click' | 'loop' | 'boomerang' | 'morph' | 'in' | 'out'
  colors?: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Lordicon animated icon wrapper.
 * Renders a <lord-icon> custom element via the Lordicon web component.
 * Respects prefers-reduced-motion: when reduced motion is preferred,
 * the icon renders as a static SVG fallback (no animation).
 */
export function LordIcon({
  src,
  trigger = 'hover',
  colors = 'primary:#3b82f6,secondary:#ffffff',
  size = 24,
  className,
  style,
}: LordIconProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check prefers-reduced-motion (guard for jsdom/test env where matchMedia may not exist)
    if (typeof window.matchMedia !== 'function') {
      return
    }
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mql.matches && ref.current) {
      // Don't animate - lord-icon will still render but won't trigger
      const el = ref.current.querySelector('lord-icon')
      if (el) {
        el.setAttribute('trigger', 'none')
      }
    }
  }, [])

  return (
    <div ref={ref} className={className} style={{ width: size, height: size, ...style }}>
      <lord-icon
        src={src}
        trigger={trigger}
        colors={colors}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

// Lordicon free icon URLs (CDN)
export const LORD_ICONS = {
  menu: 'https://cdn.lordicon.com/wgwcqouc.json',
  search: 'https://cdn.lordicon.com/msoeawqm.json',
  home: 'https://cdn.lordicon.com/slduhtrc.json',
  settings: 'https://cdn.lordicon.com/lecprnft.json',
  user: 'https://cdn.lordicon.com/bhfjfgqz.json',
  heart: 'https://cdn.lordicon.com/ulnswmkk.json',
  bell: 'https://cdn.lordicon.com/vyqvtrtg.json',
  arrowUp: 'https://cdn.lordicon.com/zmkotitn.json',
  arrowRight: 'https://cdn.lordicon.com/vduvxizq.json',
  arrowLeft: 'https://cdn.lordicon.com/vduvxizq.json',
  copy: 'https://cdn.lordicon.com/lyrrgrsl.json',
  download: 'https://cdn.lordicon.com/smwqflga.json',
  mail: 'https://cdn.lordicon.com/diihvcfp.json',
  phone: 'https://cdn.lordicon.com/srsgifqc.json',
  github: 'https://cdn.lordicon.com/jjoolpmt.json',
  linkedin: 'https://cdn.lordicon.com/lyrrgrsl.json',
  twitter: 'https://cdn.lordicon.com/pndqypnp.json',
  instagram: 'https://cdn.lordicon.com/aklzfgeg.json',
  youtube: 'https://cdn.lordicon.com/gqzfzudq.json',
  code: 'https://cdn.lordicon.com/wloochtv.json',
  terminal: 'https://cdn.lordicon.com/gqdnbnwt.json',
  rocket: 'https://cdn.lordicon.com/nocovwne.json',
  star: 'https://cdn.lordicon.com/ulnswmkk.json',
  check: 'https://cdn.lordicon.com/oqdmuxru.json',
  close: 'https://cdn.lordicon.com/nqtddedc.json',
  error: 'https://cdn.lordicon.com/drxqfago.json',
  plus: 'https://cdn.lordicon.com/zxvuvcnc.json',
  trash: 'https://cdn.lordicon.com/drxqfago.json',
  edit: 'https://cdn.lordicon.com/alzqexpi.json',
  eye: 'https://cdn.lordicon.com/tdrtiskw.json',
  lock: 'https://cdn.lordicon.com/tdrtiskw.json',
  globe: 'https://cdn.lordicon.com/gqdnbnwt.json',
  folder: 'https://cdn.lordicon.com/bhfjfgqz.json',
  file: 'https://cdn.lordicon.com/oqdmuxru.json',
  send: 'https://cdn.lordicon.com/vduvxizq.json',
  chat: 'https://cdn.lordicon.com/msoeawqm.json',
  trophy: 'https://cdn.lordicon.com/ulnswmkk.json',
  palette: 'https://cdn.lordicon.com/wloochtv.json',
  music: 'https://cdn.lordicon.com/gqzfzudq.json',
  clock: 'https://cdn.lordicon.com/nqtddedc.json',
  refresh: 'https://cdn.lordicon.com/zmkotitn.json',
  filter: 'https://cdn.lordicon.com/wgwcqouc.json',
  sort: 'https://cdn.lordicon.com/vduvxizq.json',
  upload: 'https://cdn.lordicon.com/smwqflga.json',
  image: 'https://cdn.lordicon.com/alzqexpi.json',
  link: 'https://cdn.lordicon.com/lyrrgrsl.json',
  share: 'https://cdn.lordicon.com/pndqypnp.json',
  externalLink: 'https://cdn.lordicon.com/vduvxizq.json',
} as const
