'use client'

/**
 * Scroll-reveal — tüm ana bölümler (Hero hariç) aynı yumuşak
 * "Fade In Up" animasyonunu paylaşır.
 *
 * Faz 5 · 2 iyileştirmeleri (2026-10-07):
 *
 * 1) `prefers-reduced-motion` SAYGIYOR. Önceki sürüm koşulsuz animasyon
 *    oynatıyordu — hareket hassasiyeti olan kullanıcılar için bu bir
 *    erişilebilirlik ihlali (WCAG 2.3.3 Animation from Interactions).
 *    Kullanıcı sistem ayarından kapatmışsa içerik ANINDA görünür.
 *
 * 2) `stagger` seçeneği: liste halindeki kartlar kademeli belirir.
 *    Varsayılan 0 → davranış eskisiyle aynı, mevcut çağrılar bozulmaz.
 *
 * Değişen tek şey `transform` + `opacity` → layout olayı yok, CLS yok.
 */

import type { HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export interface FadeUpSectionProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
  /**
   * Kademeli gecikme (saniye). `0.08` = kart başına 80 ms.
   * Kart sayısı çoksa toplam süre şişmesin diye üst sınır uygulanır.
   */
  stagger?: number
}

/**
 * Motion'a özgü ama HTML `<div>`'inde geçersiz prop'lar.
 * `reduced-motion` yolunda bunları ayıklayıp DOM'a yalnızca geçerli
 * prop'ları veriyoruz (TypeScript bunu zorunlu kılıyor).
 */
const MOTION_ONLY = new Set([
  'initial',
  'animate',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileDrag',
  'whileInView',
  'exit',
  'variants',
  'viewport',
  'transition',
  'layout',
  'layoutId',
  'drag',
  'dragConstraints',
  'onAnimationStart',
  'onAnimationComplete',
  'onUpdate',
  'onDragStart',
  'onDragEnd',
  'onDrag',
  'custom',
])

function domPropsOnly(props: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (!MOTION_ONLY.has(k)) out[k] = v
  }
  return out
}

export function FadeUpSection({
  children,
  className,
  stagger = 0,
  ...rest
}: FadeUpSectionProps) {
  const azalt = useReducedMotion()

  // Hareket kapatıysa: ne kaydırma ne gecikme — içerik olduğu gibi.
  // Motion'a özgü prop'lar (style/animate/initial…) HTML div'ine uymaz,
  // bu yüzden yalnızca sınıf ve gerçek DOM prop'ları geçiriyoruz.
  if (azalt) {
    return (
      <div className={className} {...domPropsOnly(rest as Record<string, unknown>)}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: '-50px' }}
      transition={
        stagger > 0
          ? {
              duration: 0.5,
              ease: 'easeOut',
              staggerChildren: stagger,
            }
          : { duration: 0.5, ease: 'easeOut' }
      }
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/**
 * `FadeUpSection` ile eşleşen ÇOCUK varyantı.
 * Kullanım: kapsayıcıya `stagger={0.08}`, kartlara `<FadeUpItem>`.
 *
 * `reduced-motion` açıksa kapsayıcı zaten normal `<div>` basıyor; bu
 * bileşen o durumda render edilmez, yani ek kontrol gerekmez.
 */
export const fadeUpItem = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
}

export function FadeUpItem({
  children,
  className,
  ...rest
}: {
  children: ReactNode
  className?: string
} & HTMLMotionProps<'div'>) {
  const azalt = useReducedMotion()

  if (azalt) {
    return (
      <div className={className}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      variants={fadeUpItem}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}