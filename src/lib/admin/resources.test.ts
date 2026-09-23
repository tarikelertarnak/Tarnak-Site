import type { ResourceDef } from '@/lib/admin/resources'
import { describe, expect, it } from 'vitest'

import { resolveFilters } from '@/lib/admin/resources'

/**
 * `resolveFilters` testleri.
 *
 * Buradaki GUVENLIK iddialari en onemlisi: istemci `f_<kolon>=<deger>`
 * gonderir, ama kolon adi ve deger BEYAZ LISTEDEN gelmeli. Aksi halde
 * saldirgan rastgele kolonlarda filtre deneyip (boolean oracle) tabloda
 * olup olmadigini ogrenemedigi veriyi ogrenebilir.
 */

const RESOURCE: ResourceDef = {
  key: 'demo',
  table: 'demo',
  label: 'Demo',
  description: '',
  icon: '',
  idColumn: 'id',
  titleColumn: 'title',
  orderBy: { column: 'id', ascending: true },
  listColumns: ['id', 'title', 'published', 'is_read', 'kind'],
  searchColumns: ['title'],
  fields: [{ name: 'title', label: 'Başlık', type: 'text' }],
  filters: [
    {
      column: 'published',
      label: 'Durum',
      type: 'boolean',
      options: [
        { value: 'true', label: 'Yayında' },
        { value: 'false', label: 'Taslak' },
      ],
    },
    {
      column: 'is_read',
      label: 'Okundu',
      type: 'boolean',
      options: [
        { value: 'false', label: 'Okunmamış' },
        { value: 'true', label: 'Okunmuş' },
      ],
    },
    {
      column: 'kind',
      label: 'Tür',
      type: 'text',
      options: [
        { value: 'image', label: 'Görsel' },
        { value: 'link', label: 'Bağlantı' },
      ],
    },
  ],
}

const NO_FILTERS: ResourceDef = { ...RESOURCE, filters: undefined }

function params(query: string) {
  return new URLSearchParams(query)
}

describe('resolveFilters', () => {
  it('parametre yoksa bos dizi doner', () => {
    expect(resolveFilters(RESOURCE, params(''))).toEqual([])
  })

  it('kaynakta filtre tanimli degilse bos dizi doner', () => {
    expect(resolveFilters(NO_FILTERS, params('f_published=true'))).toEqual([])
  })

  it('boolean filtreyi gercek boolean degerine cevirir', () => {
    expect(resolveFilters(RESOURCE, params('f_published=true')))
      .toEqual([{ column: 'published', value: true }])
    expect(resolveFilters(RESOURCE, params('f_published=false')))
      .toEqual([{ column: 'published', value: false }])
  })

  it('text filtreyi metin olarak doner', () => {
    expect(resolveFilters(RESOURCE, params('f_kind=image')))
      .toEqual([{ column: 'kind', value: 'image' }])
  })

  it('birden fazla filtreyi birlikte doner', () => {
    const out = resolveFilters(RESOURCE, params('f_published=true&f_kind=link'))
    expect(out).toHaveLength(2)
    expect(out).toContainEqual({ column: 'published', value: true })
    expect(out).toContainEqual({ column: 'kind', value: 'link' })
  })

  it('bos deger yok sayilir (filtre kaldirilmis demektir)', () => {
    expect(resolveFilters(RESOURCE, params('f_published='))).toEqual([])
  })

  // ------------------------------------------------------------- GUVENLIK

  it('BEYAZ LISTEDE OLMAYAN kolonda filtre denemesini reddeder', () => {
    // `listColumns`'ta olan ama `filters`'ta TANIMLI OLMAYAN bir kolon
    const out = resolveFilters(RESOURCE, params('f_title=gizli'))
    expect(out).toEqual([])
  })

  it('tabloda hic olmayan kolonda filtre denemesini reddeder', () => {
    expect(resolveFilters(RESOURCE, params('f_role=admin'))).toEqual([])
    expect(resolveFilters(RESOURCE, params('f_password_hash=x'))).toEqual([])
  })

  it('tanimli olmayan DEGERI reddeder', () => {
    // kind icin yalnizca image|link tanimli
    expect(resolveFilters(RESOURCE, params('f_kind=adsense'))).toEqual([])
  })

  it('boolean filtrede true/false disindaki degeri reddeder', () => {
    expect(resolveFilters(RESOURCE, params('f_published=1'))).toEqual([])
    expect(resolveFilters(RESOURCE, params('f_published=yes'))).toEqual([])
    expect(resolveFilters(RESOURCE, params('f_published=TRUE'))).toEqual([])
  })

  it('SQL/PostgREST enjeksiyon denemesi beyaz listede kalir', () => {
    // Deger beyaz listede yoksa hic uygulanmaz — sorguya girmez.
    expect(resolveFilters(RESOURCE, params('f_kind=image,id.gt.0'))).toEqual([])
    expect(resolveFilters(RESOURCE, params('f_kind=*'))).toEqual([])
    expect(resolveFilters(RESOURCE, params('f_published=true,or(id.gt.0)'))).toEqual([])
  })

  it('gecerli filtre yaninda gecersiz olan varsa yalnizca gecerliyi uygular', () => {
    const out = resolveFilters(RESOURCE, params('f_published=true&f_kind=yok&f_role=admin'))
    expect(out).toEqual([{ column: 'published', value: true }])
  })

  it('ayni filtreyi tekrarlamaz (her kolon bir kez)', () => {
    const out = resolveFilters(RESOURCE, params('f_published=true'))
    expect(out.filter(f => f.column === 'published')).toHaveLength(1)
  })
})
