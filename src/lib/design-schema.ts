import { z } from 'zod'

/**
 * GÖRSEL DÜZENLEME DOĞRULAMASI (2026-10-30).
 *
 * Güven sınırı `/api/admin/design` ucudur: HTML/JS alanları buradan geçer.
 * Uzunluk sınırları olmadan bir yönetici hesabı (ya da çalınmış çerez) tek
 * istekle megabaytlarca içerik yazıp sayfayı kilitleyebilirdi.
 *
 * `contentSchema` bu şemayı KULLANMAZ (orada `z.array(z.unknown())` kalır):
 * panel tüm içeriği tek POST'ta gönderiyor, oradaki katı şema eski kayıtları
 * düşürebilirdi. Katı doğrulama yalnız bu uçta.
 */

const styleSchema = z
  .record(z.string().max(40), z.string().max(300))
  .optional()

const animationSchema = z
  .object({
    durationMs: z.number().min(0).max(60_000).optional(),
    delayMs: z.number().min(0).max(60_000).optional(),
    easing: z.string().max(120).optional(),
    iteration: z.string().max(40).optional(),
    keyframes: z.string().max(4000).optional(),
  })
  .optional()

export const designOverrideSchema = z.object({
  id: z.string().min(1).max(80),
  page: z.string().min(1).max(200),
  selector: z.string().min(1).max(400),
  label: z.string().max(200),
  group: z.string().max(120).optional(),
  text: z.record(z.string().max(12), z.string().max(20_000)).optional(),
  html: z.string().max(20_000).optional(),
  js: z.string().max(20_000).optional(),
  css: z.string().max(20_000).optional(),
  style: styleSchema,
  animation: animationSchema,
})

export const designPageSchema = z.object({
  page: z.string().min(1).max(200),
  overrides: z.array(designOverrideSchema).max(500),
})
