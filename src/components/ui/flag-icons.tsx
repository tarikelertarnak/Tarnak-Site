import type { SVGProps } from 'react'
import { FlagTrIcon, FlagEnIcon } from '@/components/ui/icons'

/** Flag icon props. */
export interface FlagIconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

export { FlagTrIcon, FlagEnIcon }

function base(size = 16, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 512 512',
    fill: 'none',
    className,
    'aria-hidden': true,
  } as const
}

function mask(id: string, children: React.ReactNode) {
  return (
    <>
      <mask id={id}>
        <circle cx="256" cy="256" r="256" fill="#fff" />
      </mask>
      <g mask={`url(#${id})`}>{children}</g>
    </>
  )
}

/** Spanish flag (circular). */
export function FlagEsIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flages', (
        <>
          <path fill="#aa151b" d="M0 0h512v128H0zm0 384h512V512H0z" />
          <path fill="#f1bf00" d="M0 128h512v256H0z" />
          <path fill="#aa151b" d="M226 195h60v122h-60z" />
        </>
      ))}
    </svg>
  )
}

/** German flag (circular). */
export function FlagDeIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagde', (
        <>
          <path fill="#000" d="M0 0h512v171H0z" />
          <path fill="#dd0000" d="M0 171h512v170H0z" />
          <path fill="#ffce00" d="M0 341h512v171H0z" />
        </>
      ))}
    </svg>
  )
}

/** French flag (circular). */
export function FlagFrIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagfr', (
        <>
          <path fill="#0055a4" d="M0 0h171v512H0z" />
          <path fill="#fff" d="M171 0h170v512H171z" />
          <path fill="#ef4135" d="M341 0h171v512H341z" />
        </>
      ))}
    </svg>
  )
}

/** Japanese flag (circular). */
export function FlagJaIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagja', (
        <>
          <path fill="#fff" d="M0 0h512v512H0z" />
          <circle cx="256" cy="256" r="115" fill="#bc002d" />
        </>
      ))}
    </svg>
  )
}

/** Brazilian flag (circular). */
export function FlagPtIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagpt', (
        <>
          <path fill="#009c3b" d="M0 0h512v512H0z" />
          <path fill="#ffdf00" d="m256 74l182 182l-182 182L74 256z" />
          <circle cx="256" cy="256" r="82" fill="#002776" />
          <path fill="#fff" d="M230 216h76v62c0 30-19 52-38 52s-38-22-38-52z" />
        </>
      ))}
    </svg>
  )
}

/** Russian flag (circular). */
export function FlagRuIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagru', (
        <>
          <path fill="#fff" d="M0 0h512v171H0z" />
          <path fill="#0039a6" d="M0 171h512v170H0z" />
          <path fill="#d52b1e" d="M0 341h512v171H0z" />
        </>
      ))}
    </svg>
  )
}

/** Italian flag (circular). */
export function FlagItIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagit', (
        <>
          <path fill="#009246" d="M0 0h171v512H0z" />
          <path fill="#fff" d="M171 0h170v512H171z" />
          <path fill="#ce2b37" d="M341 0h171v512H341z" />
        </>
      ))}
    </svg>
  )
}

/** Chinese flag (circular). */
export function FlagZhIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagzh', (
        <>
          <path fill="#de2910" d="M0 0h512v512H0z" />
          <path fill="#ffde00" d="m118 74l12 38h40l-32 24l12 38l-32-24l-32 24l12-38l-32-24h40z" />
          <path fill="#ffde00" d="M196 116l6 20h21l-17 13l6 20l-17-13l-17 13l6-20l-17-13h21z" />
          <path fill="#ffde00" d="M206 160l6 20h21l-17 13l6 20l-17-13l-17 13l6-20l-17-13h21z" />
          <path fill="#ffde00" d="M190 204l6 20h21l-17 13l6 20l-17-13l-17 13l6-20l-17-13h21z" />
          <path fill="#ffde00" d="M170 238l6 20h21l-17 13l6 20l-17-13l-17 13l6-20l-17-13h21z" />
        </>
      ))}
    </svg>
  )
}

/** Dutch flag (circular). */
export function FlagNlIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagnl', (
        <>
          <path fill="#ae1c28" d="M0 0h512v171H0z" />
          <path fill="#fff" d="M0 171h512v170H0z" />
          <path fill="#21468b" d="M0 341h512v171H0z" />
        </>
      ))}
    </svg>
  )
}

/** Polish flag (circular). */
export function FlagPlIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagpl', (
        <>
          <path fill="#fff" d="M0 0h512v256H0z" />
          <path fill="#dc143c" d="M0 256h512v256H0z" />
        </>
      ))}
    </svg>
  )
}

/** Korean flag (circular, simplified). */
export function FlagKoIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagko', (
        <>
          <path fill="#fff" d="M0 0h512v512H0z" />
          <circle cx="256" cy="256" r="120" fill="#cd2e3a" />
          <path fill="#0047a0" d="M256 136a120 120 0 0 0 0 240 96 96 0 0 1 0-240" />
          <circle cx="322" cy="196" r="26" fill="#cd2e3a" />
          <circle cx="190" cy="316" r="26" fill="#0047a0" />
          <g stroke="#000" strokeWidth="10">
            <path d="M70 116l46 46m-46 0l46-46" />
            <path d="M70 350l46 46m-46 0l46-46" />
            <path d="M396 116l46 46m-46 0l46-46" />
            <path d="M396 350l46 46m-46 0l46-46" />
            <path d="M180 64h70M180 448h70M262 64h70M262 448h70" />
            <path d="M64 200h60M64 312h60M388 200h60M388 312h60" />
          </g>
        </>
      ))}
    </svg>
  )
}

/** Arabic (Saudi) flag (circular, simplified). */
export function FlagArIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagar', (
        <>
          <path fill="#165d31" d="M0 0h512v512H0z" />
          <path fill="#fff" d="M96 316h320v40H96z" />
          <path fill="#fff" d="M196 156l12 28-24 16l28 4l12 26l12-26l28-4l-24-16l12-28l-28 12z" />
        </>
      ))}
    </svg>
  )
}

/** Indonesian flag (circular). */
export function FlagIdIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagid', (
        <>
          <path fill="#ce1126" d="M0 0h512v256H0z" />
          <path fill="#fff" d="M0 256h512v256H0z" />
        </>
      ))}
    </svg>
  )
}

/** Vietnamese flag (circular). */
export function FlagViIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagvi', (
        <>
          <path fill="#da251d" d="M0 0h512v512H0z" />
          <path fill="#ffff00" d="m256 92l38 116l122 1l-99 72l38 116l-99-73l-99 73l38-116l-99-72l122-1z" />
        </>
      ))}
    </svg>
  )
}

/** Persian (Iran) flag (circular, simplified). */
export function FlagFaIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagfa', (
        <>
          <path fill="#239f40" d="M0 0h512v128H0z" />
          <path fill="#fff" d="M0 128h512v256H0z" />
          <path fill="#da0000" d="M0 384h512v128H0z" />
          <path fill="#da0000" d="M216 256a40 40 0 1 0 40 40a32 32 0 1 1-40-40m60-17a72 72 0 1 0 3 71a56 56 0 0 1-3-71" />
          <rect x="256" y="216" width="44" height="20" fill="#da0000" />
          <g fill="#da0000">
            <path d="M92 128l10 24h-20zm20 0l10 24h-20z" />
            <path d="M122 128l10 24h-20zm20 0l10 24h-20z" />
            <path d="M152 128l10 24h-20zm20 0l10 24h-20z" />
            <path d="M182 128l10 24h-20zm20 0l10 24h-20z" />
            <path d="M290 128l10 24h-20zm20 0l10 24h-20z" />
            <path d="M320 128l10 24h-20zm20 0l10 24h-20z" />
            <path d="M350 128l10 24h-20zm20 0l10 24h-20z" />
            <path d="M92 384l10 24h-20zm20 0l10 24h-20z" />
            <path d="M122 384l10 24h-20zm20 0l10 24h-20z" />
            <path d="M152 384l10 24h-20zm20 0l10 24h-20z" />
            <path d="M182 384l10 24h-20zm20 0l10 24h-20z" />
            <path d="M290 384l10 24h-20zm20 0l10 24h-20z" />
            <path d="M320 384l10 24h-20zm20 0l10 24h-20z" />
            <path d="M350 384l10 24h-20zm20 0l10 24h-20z" />
          </g>
        </>
      ))}
    </svg>
  )
}

/** Ukrainian flag (circular). */
export function FlagUkIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flaguk', (
        <>
          <path fill="#0057b7" d="M0 0h512v256H0z" />
          <path fill="#ffd700" d="M0 256h512v256H0z" />
        </>
      ))}
    </svg>
  )
}

/** Thai flag (circular). */
export function FlagThIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagth', (
        <>
          <path fill="#a51931" d="M0 0h512v85H0zm0 427h512v85H0z" />
          <path fill="#f4f5f8" d="M0 85h512v86H0zm0 256h512v86H0z" />
          <path fill="#2d2a4a" d="M0 171h512v170H0z" />
        </>
      ))}
    </svg>
  )
}

/** Czech flag (circular). */
export function FlagCsIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagcs', (
        <>
          <path fill="#fff" d="M0 0h512v256H0z" />
          <path fill="#d7141a" d="M0 256h512v256H0z" />
          <path fill="#11457e" d="M0 0l256 256L0 512z" />
        </>
      ))}
    </svg>
  )
}

/** Hungarian flag (circular). */
export function FlagHuIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flaghu', (
        <>
          <path fill="#cd2a3e" d="M0 0h512v171H0z" />
          <path fill="#fff" d="M0 171h512v170H0z" />
          <path fill="#436f4d" d="M0 341h512v171H0z" />
        </>
      ))}
    </svg>
  )
}

/** Romanian flag (circular). */
export function FlagRoIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagro', (
        <>
          <path fill="#002b7f" d="M0 0h171v512H0z" />
          <path fill="#fcd116" d="M171 0h170v512H171z" />
          <path fill="#ce1126" d="M341 0h171v512H341z" />
        </>
      ))}
    </svg>
  )
}

/** Swedish flag (circular). */
export function FlagSvIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagsv', (
        <>
          <path fill="#006aa7" d="M0 0h512v512H0z" />
          <path fill="#fecc00" d="M0 200h512v112H0z" />
          <path fill="#fecc00" d="M170 0h112v512H170z" />
        </>
      ))}
    </svg>
  )
}

/** Greek flag (circular). */
export function FlagElIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flagel', (
        <>
          <path fill="#0d5eaf" d="M0 0h512v512H0z" />
          <g fill="#fff">
            <path d="M0 0h512v51H0zm0 115h512v51H0zm0 230h512v51H0zm0 115h512v51H0z" />
            <path d="M0 0h256v307H0z" />
          </g>
          <path fill="#0d5eaf" d="M93 0h70v148H0v51h163v108h51V199h298v-51H214V0z" />
        </>
      ))}
    </svg>
  )
}

/** Hebrew (Israel) flag (circular). */
export function FlagHeIcon({ size = 16, className }: FlagIconProps) {
  return (
    <svg {...base(size, className)}>
      {mask('svgt-flaghe', (
        <>
          <path fill="#fff" d="M0 0h512v512H0z" />
          <path fill="#0038b8" d="M0 0h512v56H0zm0 456h512v56H0z" />
          <g fill="none" stroke="#0038b8" strokeWidth="13">
            <path d="m256 150l70 122l-70 122l-70-122z" />
            <path d="m256 262l28 48h-56zm0-63l52 90l-52 89l-52-90z" />
          </g>
        </>
      ))}
    </svg>
  )
}

export const flagIcons: Record<string, (props: FlagIconProps) => React.JSX.Element> = {
  tr: FlagTrIcon,
  en: FlagEnIcon,
  es: FlagEsIcon,
  de: FlagDeIcon,
  fr: FlagFrIcon,
  ja: FlagJaIcon,
  pt: FlagPtIcon,
  ru: FlagRuIcon,
  it: FlagItIcon,
  zh: FlagZhIcon,
  nl: FlagNlIcon,
  pl: FlagPlIcon,
  ko: FlagKoIcon,
  ar: FlagArIcon,
  id: FlagIdIcon,
  vi: FlagViIcon,
  fa: FlagFaIcon,
  uk: FlagUkIcon,
  th: FlagThIcon,
  cs: FlagCsIcon,
  hu: FlagHuIcon,
  ro: FlagRoIcon,
  sv: FlagSvIcon,
  el: FlagElIcon,
  he: FlagHeIcon,
}