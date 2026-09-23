import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // ⚠️ `new URL('./src', import.meta.url).pathname` WINDOWS'TA BOZUKTUR:
      // yolu "/C:/Users/TARIK%20ELER%20TARNAK/site/src" olarak dondurur
      // (bastaki slash + yuzde-kodlanmis bosluklar). Bu yuzden "@" alias'i
      // hicbir zaman cozulemiyordu ve TUM test dosyalari
      // "Failed to resolve import" ile patliyordu.
      // fileURLToPath hem surucu harfini hem yuzde kodlamasini duzeltir.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // Next.js + Tailwind v4 PostCSS config breaks vitest CSS pipeline; skip it.
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})