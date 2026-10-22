'use client'

import type { ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useRef } from 'react'

interface Tilt3DProps {
  children: ReactNode
  className?: string
  /** Max tilt in degrees. */
  intensity?: number
  /** Perspective distance in px. */
  perspective?: number
}

/**
 * Subtle 3D tilt on hover — tracks pointer position and applies a
 * perspective transform. Resets smoothly on mouse leave. No glow/cursor
 * background (design language), just a clean dimensional lift.
 */
export function Tilt3D({
  children,
  className,
  intensity = 8,
  perspective = 900,
}: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [intensity, -intensity]), {
    stiffness: 200,
    damping: 20,
  })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-intensity, intensity]), {
    stiffness: 200,
    damping: 20,
  })

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el)
      return
    const rect = el.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        perspective,
        transformStyle: 'preserve-3d',
        rotateX,
        rotateY,
      }}
    >
      {children}
    </motion.div>
  )
}
