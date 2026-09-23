import { describe, expect, it } from 'vitest'

import { isMissingColumnError, missingColumnFrom } from '@/lib/postgrest'

/**
 * PostgREST hata siniflandirmasi.
 *
 * REGRESYON: iletisim formu eksik kolonu yalnizca `42703` ile kontrol ediyordu.
 * Gercek kod `PGRST204` cikti, bu yuzden telefonla gonderilen mesajlar
 * 500 alip KAYBOLUYORDU. Bu testler iki kodu da kapsar.
 */

describe('isMissingColumnError', () => {
  it('42703 (Postgres) hata kodunu tanir', () => {
    expect(isMissingColumnError({ code: '42703' })).toBe(true)
  })

  it('PGRST204 (PostgREST sema onbellegi) kodunu TANIR — regresyon', () => {
    // Olculdu: Supabase bilinmeyen kolonda bunu donduruyor.
    expect(isMissingColumnError({
      code: 'PGRST204',
      message: 'Could not find the \'phone\' column of \'messages\' in the schema cache',
    })).toBe(true)
  })

  it('ilgisiz hata kodlarinda false doner', () => {
    expect(isMissingColumnError({ code: '23505' })).toBe(false) // unique ihlali
    expect(isMissingColumnError({ code: 'PGRST205' })).toBe(false) // tablo yok
    expect(isMissingColumnError({ code: '42P01' })).toBe(false) // relation yok
    expect(isMissingColumnError({ code: '42501' })).toBe(false) // yetki
    expect(isMissingColumnError(null)).toBe(false)
    expect(isMissingColumnError(undefined)).toBe(false)
    expect(isMissingColumnError({})).toBe(false)
  })
})

describe('missingColumnFrom', () => {
  it('42703 mesajindan kolon adini cikarir', () => {
    expect(missingColumnFrom({
      code: '42703',
      message: 'column messages.phone does not exist',
    })).toBe('phone')
  })

  it('PGRST204 mesajindan kolon adini cikarir', () => {
    expect(missingColumnFrom({
      code: 'PGRST204',
      message: 'Could not find the \'phone\' column of \'messages\' in the schema cache',
    })).toBe('phone')
  })

  it('alt cizgili/sayili kolon adlarini da cikarir', () => {
    expect(missingColumnFrom({
      code: 'PGRST204',
      message: 'Could not find the \'token_nonce\' column of \'ad_views\' in the schema cache',
    })).toBe('token_nonce')
  })

  it('ilgisiz kodda null doner (yanlis kolonu dusurmeyelim)', () => {
    expect(missingColumnFrom({ code: '23505', message: 'duplicate key' })).toBeNull()
    expect(missingColumnFrom({ code: '42P01', message: 'relation does not exist' })).toBeNull()
  })

  it('kod dogru ama mesaj tanidik degilse null doner', () => {
    expect(missingColumnFrom({ code: '42703', message: 'beklenmeyen mesaj' })).toBeNull()
  })
})
