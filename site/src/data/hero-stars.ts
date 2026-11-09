/**
 * Static star particles in the hero section. Deterministic positions
 * (no hydration mismatch); x/y as percentages. To change: edit the array
 * depending on whether you want the screen to be "denser" or "sparser".
 */
export interface Star {
  /** 0-100 percent, from the left */
  x: number
  /** 0-100 percent, from the top */
  y: number
  /** animation start delay (s) */
  delay: number
  /** 0.5 | 1 | 1.5 — star size multiplier */
  size: 0.5 | 1 | 1.5
}

export const HERO_STARS: readonly Star[] = [
  { x: 8, y: 12, delay: 0.0, size: 1 },
  { x: 18, y: 30, delay: 0.4, size: 0.5 },
  { x: 92, y: 8, delay: 0.8, size: 1.5 },
  { x: 88, y: 22, delay: 0.2, size: 1 },
  { x: 95, y: 40, delay: 1.1, size: 0.5 },
  { x: 78, y: 12, delay: 0.6, size: 1 },
  { x: 6, y: 50, delay: 0.3, size: 1.5 },
  { x: 14, y: 68, delay: 0.9, size: 1 },
  { x: 90, y: 60, delay: 0.5, size: 0.5 },
  { x: 82, y: 78, delay: 1.4, size: 1 },
  { x: 96, y: 88, delay: 0.1, size: 1 },
  { x: 22, y: 92, delay: 0.7, size: 1.5 },
  { x: 4, y: 80, delay: 1.0, size: 0.5 },
  { x: 50, y: 4, delay: 0.4, size: 1 },
  { x: 48, y: 96, delay: 0.8, size: 1 },
  { x: 38, y: 22, delay: 1.2, size: 0.5 },
  { x: 64, y: 16, delay: 0.0, size: 1 },
  { x: 32, y: 44, delay: 0.6, size: 0.5 },
  { x: 72, y: 46, delay: 1.3, size: 1 },
  { x: 60, y: 72, delay: 0.2, size: 1.5 },
  { x: 44, y: 84, delay: 0.9, size: 1 },
  { x: 26, y: 6, delay: 1.5, size: 0.5 },
  { x: 68, y: 90, delay: 0.3, size: 1 },
  { x: 86, y: 52, delay: 1.1, size: 0.5 },
] as const
