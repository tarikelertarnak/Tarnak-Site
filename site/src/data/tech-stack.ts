/**
 * Tech chips orbiting in the 3 rings of the hero section.
 * 6 inner + 8 middle + 7 outer = 21 chips. To add one:
 * 1. Add to TECHS
 * 2. Check Orbit/angle overlap (chips must not overlap)
 * 3. Add a color to COLOR_CLASS if needed
 *
 * @see components/sections/hero-section.tsx
 */
export type TechColor
  = | 'sky'
    | 'amber'
    | 'emerald'
    | 'rose'
    | 'violet'
    | 'cyan'
    | 'orange'
    | 'fuchsia'
    | 'lime'
    | 'blue'
    | 'red'
    | 'indigo'
    | 'teal'
    | 'yellow'
    | 'pink'

export interface Tech {
  label: string
  short: string
  color: TechColor
  /** 0=inner, 1=middle, 2=outer orbit */
  orbit: 0 | 1 | 2
  /** 0-360 degrees, orbit start angle */
  angle: number
}

export const TECHS: readonly Tech[] = [
  // Inner orbit (6 chips) — closest
  { label: 'TypeScript', short: 'TS', color: 'sky', orbit: 0, angle: 15 },
  { label: 'React', short: 'R', color: 'cyan', orbit: 0, angle: 75 },
  { label: 'Next.js', short: 'N', color: 'teal', orbit: 0, angle: 135 },
  { label: 'Node.js', short: 'N', color: 'emerald', orbit: 0, angle: 195 },
  { label: 'Python', short: 'PY', color: 'yellow', orbit: 0, angle: 255 },
  { label: 'Docker', short: 'DK', color: 'sky', orbit: 0, angle: 315 },
  // Middle orbit (8 chips)
  { label: 'JavaScript', short: 'JS', color: 'amber', orbit: 1, angle: 22 },
  { label: 'PostgreSQL', short: 'PG', color: 'blue', orbit: 1, angle: 67 },
  { label: 'Tailwind', short: 'TW', color: 'cyan', orbit: 1, angle: 112 },
  { label: 'Git', short: 'G', color: 'orange', orbit: 1, angle: 157 },
  { label: 'MongoDB', short: 'MG', color: 'emerald', orbit: 1, angle: 202 },
  { label: 'Rust', short: 'RS', color: 'orange', orbit: 1, angle: 247 },
  { label: 'Go', short: 'GO', color: 'cyan', orbit: 1, angle: 292 },
  { label: 'Vue', short: 'V', color: 'emerald', orbit: 1, angle: 337 },
  // Outer orbit (7 chips)
  { label: 'Java', short: 'JV', color: 'red', orbit: 2, angle: 30 },
  { label: 'C++', short: 'C+', color: 'sky', orbit: 2, angle: 80 },
  { label: 'C#', short: 'C#', color: 'violet', orbit: 2, angle: 130 },
  { label: 'Ruby', short: 'RB', color: 'rose', orbit: 2, angle: 180 },
  { label: 'PHP', short: 'PHP', color: 'indigo', orbit: 2, angle: 230 },
  { label: 'Figma', short: 'FG', color: 'fuchsia', orbit: 2, angle: 280 },
  { label: 'AI', short: 'AI', color: 'lime', orbit: 2, angle: 330 },
] as const

/** Orbit radii (px), container ~560×560 */
export const ORBIT_R = [145, 215, 285] as const
