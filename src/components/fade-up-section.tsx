'use client'

/**
 * Scroll-reveal wrapper — all main sections (except Hero) share the same smooth
 * "Fade In Up" animation, collected here.
 *
 * Kurallar:
 *  - Only opacity + transform: translateY change (no layout shift).
 *  - Runs only once when the section first enters the viewport (`once: true`).
 *  - Threshold pulled slightly up (`margin: "-50px"`) so the animation
 *    starts before the user gets close to the section.
 *  - Delay/duration: identical across sections (0.5s, easeOut).
 */

import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

export interface FadeUpSectionProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
}

export function FadeUpSection({ children, className, ...rest }: FadeUpSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: '-50px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
