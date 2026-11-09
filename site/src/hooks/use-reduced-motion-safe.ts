'use client'

import { useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

/**
 * `motion`'ın `useReducedMotion`'ı güvenli DEĞİL (2026-10-16 ölçüldü):
 *
 * - Sunucuda `prefersReducedMotion.current` → `null` (matchMedia yok) → `false`.
 * - İstemcide `initPrefersReducedMotion()` **render sırasında** çalışıp gerçek
 *   değeri yazıyor → ilk render'da `true`.
 *
 * Tercih doğrudan kullanılırsa sunucu HTML'i ile istemcinin ilk render'ı
 * ayrışır: React sunucunun attribute'larını düzeltmediği için
 * `style="opacity:0;transform:translateY(24px)"` DOM'da kalır, istemci de artık
 * animasyonu sürmeyen düz bir `<div>` bastığı için içerik **hiç görünmez**
 * (canlı kanıt: `prefers-reduced-motion: reduce` olan tarayıcıda `/` sayfasında
 * 6 sarmalayıcı `getComputedStyle().opacity === '0'`). React ayrıca iç içe
 * `useId` değerlerini kaydırdığı için form alanlarının `id`/`htmlFor` çiftleri
 * de uyuşmuyordu.
 *
 * Çözüm: tercih yalnızca mount SONRASI uygulanır. İlk istemci render'ı sunucu
 * ile birebir aynı kalır (hydration temiz), ardından azaltılmış hareket
 * devreye girer.
 */
export function useReducedMotionSafe(): boolean {
  const azalt = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted && azalt === true
}
