import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    // Next.js + Tailwind v4 PostCSS config breaks vitest CSS pipeline; skip it.
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})