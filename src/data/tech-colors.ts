import type { TechColor } from './tech-stack'

/**
 * Tech chip colors — ring + bg + text (lucide-style tonal background).
 * To add a color: check that it exists in tailwind, then use it in TECHS.
 */
export const TECH_COLORS: Record<
  TechColor,
  { ring: string; bg: string; text: string }
> = {
  sky: { ring: 'ring-sky-400/70', bg: 'bg-sky-500/20', text: 'text-sky-300' },
  amber: { ring: 'ring-amber-400/70', bg: 'bg-amber-500/20', text: 'text-amber-300' },
  emerald: {
    ring: 'ring-emerald-400/70',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-300',
  },
  rose: { ring: 'ring-rose-400/70', bg: 'bg-rose-500/20', text: 'text-rose-300' },
  violet: {
    ring: 'ring-violet-400/70',
    bg: 'bg-violet-500/20',
    text: 'text-violet-300',
  },
  cyan: { ring: 'ring-cyan-400/70', bg: 'bg-cyan-500/20', text: 'text-cyan-300' },
  orange: {
    ring: 'ring-orange-400/70',
    bg: 'bg-orange-500/20',
    text: 'text-orange-300',
  },
  fuchsia: {
    ring: 'ring-fuchsia-400/70',
    bg: 'bg-fuchsia-500/20',
    text: 'text-fuchsia-300',
  },
  lime: { ring: 'ring-lime-400/70', bg: 'bg-lime-500/20', text: 'text-lime-300' },
  blue: { ring: 'ring-blue-400/70', bg: 'bg-blue-500/20', text: 'text-blue-300' },
  red: { ring: 'ring-red-400/70', bg: 'bg-red-500/20', text: 'text-red-300' },
  indigo: {
    ring: 'ring-indigo-400/70',
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-300',
  },
  teal: { ring: 'ring-teal-400/70', bg: 'bg-teal-500/20', text: 'text-teal-300' },
  yellow: {
    ring: 'ring-yellow-400/70',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-300',
  },
  pink: { ring: 'ring-pink-400/70', bg: 'bg-pink-500/20', text: 'text-pink-300' },
} as const
