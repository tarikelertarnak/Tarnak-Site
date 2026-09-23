import type { FieldDef, ResourceDef } from '@/lib/admin/resources'
import { describe, expect, it } from 'vitest'

import { buildPayload, coerce, missingColumnFrom, slugify } from '@/lib/admin/data'

/**
 * Admin veri katmani testleri.
 *
 * Buradaki en kritik test "whitelist" testidir: istemciden gelen fazladan
 * alanlar DB'ye YAZILMAMALI. Aksi halde bir kullanici govdeye
 * {"is_owner": true} veya {"role": "admin"} ekleyip yetki yukseltebilirdi.
 */

describe('slugify', () => {
  it('turkce karakterleri dogru cevirir', () => {
    expect(slugify('Çiğdem Şölen İçin Örnek')).toBe('cigdem-solen-icin-ornek')
  })

  // Regresyon: 'İ'.toLowerCase() 'i' + U+0307 uretir; birlestirici nokta
  // tireye donusup "i-stanbul" gibi bozuk slug cikariyordu.
  it('İ ile baslayan kelimelerde birlesik nokta sizmasina izin vermez', () => {
    expect(slugify('İstanbul Rehberi')).toBe('istanbul-rehberi')
    expect(slugify('İçerik Yönetimi')).toBe('icerik-yonetimi')
    expect(slugify('İlk Yazı')).toBe('ilk-yazi')
  })

  it('noktasiz i ve buyuk I harflerini dogru esler', () => {
    expect(slugify('IĞDIR')).toBe('igdir')
    expect(slugify('ısı')).toBe('isi')
  })

  it('turkce olmayan latin aksanlarini da cozer', () => {
    expect(slugify('Café Ñandú Ångström')).toBe('cafe-nandu-angstrom')
  })

  it('bosluk ve sembolleri tire yapar', () => {
    expect(slugify('Next.js 16 + Supabase!')).toBe('next-js-16-supabase')
  })

  it('bastaki/sondaki tireleri kirpar ve tekrarlari birlestirir', () => {
    expect(slugify('  --- Merhaba   Dünya ---  ')).toBe('merhaba-dunya')
  })

  it('120 karakterle sinirlar', () => {
    expect(slugify('a'.repeat(300))).toHaveLength(120)
  })

  it('tamamen sembolden olusan girdide bos dondurur', () => {
    expect(slugify('!!!***')).toBe('')
  })
})

describe('coerce', () => {
  const text: FieldDef = { name: 'title', label: 'Başlık', type: 'text' }
  const required: FieldDef = { ...text, required: true }
  const tags: FieldDef = { name: 'tags', label: 'Etiketler', type: 'tags' }
  const flag: FieldDef = { name: 'published', label: 'Yayında', type: 'boolean' }
  const num: FieldDef = { name: 'level', label: 'Seviye', type: 'number', min: 0, max: 100 }
  const sel: FieldDef = { name: 'kind', label: 'Tür', type: 'select', options: ['image', 'link'] }
  const url: FieldDef = { name: 'repo_url', label: 'Repo', type: 'url' }
  const capped: FieldDef = { name: 'slug', label: 'Slug', type: 'text', maxLength: 5 }

  it('undefined = alana dokunulmadi, zorunlu degilse gecer', () => {
    expect(coerce(text, undefined)).toEqual({ ok: true, value: undefined })
  })

  it('undefined + zorunlu = hata', () => {
    const r = coerce(required, undefined)
    expect(r.ok).toBe(false)
  })

  it('bos string zorunlu alanda hata verir (sessizce NULL yazmaz)', () => {
    expect(coerce(required, '').ok).toBe(false)
  })

  it('bos string opsiyonel metinde NULL olur', () => {
    expect(coerce(text, '')).toEqual({ ok: true, value: null })
  })

  it('bos string tags alaninda [] olur (null degil)', () => {
    expect(coerce(tags, '')).toEqual({ ok: true, value: [] })
  })

  it('bos string boolean alaninda false olur', () => {
    expect(coerce(flag, '')).toEqual({ ok: true, value: false })
  })

  it('tags virgulden ayirir ve temizler', () => {
    expect(coerce(tags, ' nextjs , react ,, ts ')).toEqual({
      ok: true,
      value: ['nextjs', 'react', 'ts'],
    })
  })

  it('tags dizi girdisini de kabul eder', () => {
    expect(coerce(tags, ['a', 'b'])).toEqual({ ok: true, value: ['a', 'b'] })
  })

  it('boolean cesitli dogru degerleri kabul eder', () => {
    expect(coerce(flag, true)).toEqual({ ok: true, value: true })
    expect(coerce(flag, 'true')).toEqual({ ok: true, value: true })
    expect(coerce(flag, 1)).toEqual({ ok: true, value: true })
    expect(coerce(flag, 0)).toEqual({ ok: true, value: false })
  })

  it('sayi olmayan degeri reddeder', () => {
    expect(coerce(num, 'abc').ok).toBe(false)
  })

  it('min/max sinirini uygular', () => {
    expect(coerce(num, -1).ok).toBe(false)
    expect(coerce(num, 101).ok).toBe(false)
    expect(coerce(num, 50)).toEqual({ ok: true, value: 50 })
  })

  it('ondalik sayiyi yuvarlar', () => {
    expect(coerce(num, '42.7')).toEqual({ ok: true, value: 43 })
  })

  it('select listesinde olmayan degeri reddeder', () => {
    expect(coerce(sel, 'evil').ok).toBe(false)
    expect(coerce(sel, 'image')).toEqual({ ok: true, value: 'image' })
  })

  it('url alaninda sema zorunlu kilar ama site-ici yola izin verir', () => {
    expect(coerce(url, 'javascript:alert(1)').ok).toBe(false)
    expect(coerce(url, 'ftp://x.com').ok).toBe(false)
    expect(coerce(url, 'https://github.com/x')).toEqual({ ok: true, value: 'https://github.com/x' })
    expect(coerce(url, '/gorsel.png')).toEqual({ ok: true, value: '/gorsel.png' })
  })

  it('maxLength asimini reddeder', () => {
    expect(coerce(capped, '123456').ok).toBe(false)
    expect(coerce(capped, '12345')).toEqual({ ok: true, value: '12345' })
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

  it('ilgisiz hata kodunda null doner (yanlis kolonu silmeyelim)', () => {
    expect(missingColumnFrom({ code: '23505', message: 'duplicate key' })).toBeNull()
    expect(missingColumnFrom({ code: '42P01', message: 'relation does not exist' })).toBeNull()
  })
})

describe('buildPayload', () => {
  const RESOURCE: ResourceDef = {
    key: 'demo',
    table: 'demo',
    label: 'Demo',
    description: '',
    icon: '',
    idColumn: 'id',
    titleColumn: 'title',
    orderBy: { column: 'id', ascending: true },
    listColumns: ['id', 'title', 'slug', 'published'],
    searchColumns: ['title'],
    autoSlugFrom: 'title',
    fields: [
      { name: 'title', label: 'Başlık', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text' },
      { name: 'published', label: 'Yayında', type: 'boolean' },
      { name: 'role', label: 'Rol', type: 'select', options: ['user', 'admin'], immutable: true },
    ],
  }

  it('whitelist: tanimsiz alanlari DB payload icine KOYMAZ', () => {
    const r = buildPayload(RESOURCE, { title: 'Merhaba', is_owner: true, id: 999 }, false)
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.payload).not.toHaveProperty('is_owner')
    expect(r.payload).not.toHaveProperty('id')
    expect(r.payload.title).toBe('Merhaba')
  })

  it('zorunlu alan eksikse insert reddedilir', () => {
    const r = buildPayload(RESOURCE, { slug: 'x' }, false)
    expect(r.ok).toBe(false)
    if (r.ok) {
      return
    }
    expect(r.error).toContain('Başlık')
  })

  it('partial (PATCH) zorunlu alani istemez', () => {
    const r = buildPayload(RESOURCE, { published: true }, true)
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.payload).toEqual({ published: true })
  })

  it('immutable alan INSERT\'te yazilabilir', () => {
    const r = buildPayload(RESOURCE, { title: 'a', role: 'admin' }, false)
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.payload.role).toBe('admin')
  })

  it('immutable alan PATCH\'te YOK SAYILIR (yetki yukseltme kapali)', () => {
    const r = buildPayload(RESOURCE, { title: 'a', role: 'admin' }, true)
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.payload).not.toHaveProperty('role')
  })

  it('slug bos birakilirsa basliktan uretilir', () => {
    const r = buildPayload(RESOURCE, { title: 'Çiğdem Şölen' }, false)
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.payload.slug).toBe('cigdem-solen')
  })

  it('slug verilmisse basliktan uretilmez', () => {
    const r = buildPayload(RESOURCE, { title: 'Merhaba', slug: 'ozel-slug' }, false)
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.payload.slug).toBe('ozel-slug')
  })

  it('bos govde reddedilir', () => {
    const r = buildPayload(RESOURCE, {}, true)
    expect(r.ok).toBe(false)
  })

  it('gecersiz alan degeri tum islemi reddettirir', () => {
    const r = buildPayload(RESOURCE, { title: 'a', role: 'superadmin' }, false)
    expect(r.ok).toBe(false)
  })
})
