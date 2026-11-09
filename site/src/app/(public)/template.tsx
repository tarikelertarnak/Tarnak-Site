'use client'

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe'

/**
 * Sayfa geçiş animasyonu — fade + hafif kaldırma (yalnız PUBLIC rotalar).
 *
 * NEDEN `(public)` route group'ında, kökte değil:
 *
 * `template.tsx` route değişiminde YENİDEN MOUNT edilir → içindeki Client
 * Component'lerin state'i sıfırlanır. `/admin` (panel sekmeleri, form
 * state'i) ve `/chat` (mesaj akışı, açık oturum) bu yüzden bu şablonun
 * DIŞINDA kalmalı. Route group `(public)` URL'i değiştirmez ama segment
 * sınırı yaratır: yalnızca public sayfaların ağacına girer.
 * `app/layout.tsx` TEK kök layout olarak kalır → public ↔ admin geçişinde
 * tam sayfa yenilemesi olmaz.
 *
 * `AnimatePresence` KULLANILMAZ: App Router'da `exit` güvenilir çalışmaz
 * (route değişiminde eski ağaç React ağacından düşer, çıkış animasyonu
 * oynatılmaz). Yalnız `initial` → `animate` yeterli: template her rota
 * değişiminde yeniden mount olduğu için giriş animasyonu kendiliğinden
 * tekrarlanır.
 *
 * HAREKET AZALTMA (WCAG 2.3.3): tercih `useReducedMotionSafe` ile okunur.
 * `motion`'ın `useReducedMotion`'ı sunucuda `null` döner; doğrudan
 * kullanılsaydı sunucu `opacity:0` basıp istemci düz `<div>` basardı ve
 * React attribute'ları düzeltmediği için içerik GÖRÜNMEZ kalırdı
 * (bkz. src/hooks/use-reduced-motion-safe.ts). Tercih açıksa düz `<div>`
 * basılır, içerik ANINDA görünür.
 *
 * `transform` + `opacity` only → layout olayı yok, CLS yok.
 * Süre `--duration-base` (tokens.css: 200ms), eğri `--ease-out`
 * (tokens.css: cubic-bezier(0.16, 1, 0.3, 1)).
 */
export default function PublicTemplate({
  children,
}: {
  children: ReactNode
}) {
  const azalt = useReducedMotionSafe()

  if (azalt) {
    return <div>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
