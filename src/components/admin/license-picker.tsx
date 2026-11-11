'use client'

import { Icon } from '@iconify/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Lisans seçici (2026-11-11, kullanıcı isteği).
 *
 * · Liste GERÇEK SPDX kimliklerinden oluşur (ActivaterWindows, Batchfile, MIT…).
 * · ⓘ düğmesi seçili lisansın ne olduğunu SÖYLER (kısa Türkçe açıklama).
 * · Panel TIKLANINCA açılır ve **fare konumundan bağımsız** açık kalır
 *   (hover ile kapanmaz); dışarı tıklama veya ESC ile kapanır.
 */
export interface LicenseOption {
  id: string
  desc: string
}

export const LICENSES: LicenseOption[] = [
  { id: 'MIT', desc: 'Serbest kullanım, değiştirme, dağıtım; lisans metni ve telif bildirimi korunur.' },
  { id: 'MIT-0', desc: 'MIT gibi, atıf zorunluluğu olmadan.' },
  { id: 'Apache-2.0', desc: 'MIT benzeri + patent koruması; değişiklik bildirimi zorunlu.' },
  { id: 'GPL-2.0', desc: 'Copyleft: türev çalışmalar da GPL-2.0 olmak zorunda.' },
  { id: 'GPL-3.0', desc: 'Copyleft: türev çalışmalar da GPL-3.0 olmak zorunda.' },
  { id: 'LGPL-2.1', desc: 'Kütüphane olarak kullanılabilir; değişiklikler açılmalı.' },
  { id: 'LGPL-3.0', desc: 'Kütüphane olarak kullanılabilir; değişiklikler açılmalı.' },
  { id: 'AGPL-3.0', desc: 'Ağ üzerinden sunumda da kaynak paylaşımı doğurur.' },
  { id: 'MPL-2.0', desc: 'Dosya bazlı copyleft: değişen dosyalar açılmalı.' },
  { id: 'BSL-1.0', desc: 'Boost Software License — C++ kalite standardı.' },
  { id: 'BSL-1.1', desc: 'Boost Software License 1.1 — patent grant düzeltmesi.' },
  { id: 'BSD-2-Clause', desc: 'MIT benzeri; ün/patent maddesi yok.' },
  { id: 'BSD-3-Clause', desc: 'BSD + ün ve patent maddesi.' },
  { id: '0BSD', desc: 'BSD — patent ve ün maddeleri olmadan.' },
  { id: 'ISC', desc: 'MIT benzeri, çok kısa metin.' },
  { id: 'Unlicense', desc: 'Tamamen kamu malı — hiçbir koşul yok.' },
  { id: 'CC0-1.0', desc: 'Telif hakkından feragat (yaygın varlık/veri).' },
  { id: 'CC-BY-4.0', desc: 'Atıf zorunlu, ticari kullanım serbest.' },
  { id: 'CC-BY-SA-4.0', desc: 'Atıf + aynı lisansla paylaşım zorunlu.' },
  { id: 'OFL-1.1', desc: 'Open Font License — font dosyaları için.' },
  { id: 'EPL-1.0', desc: 'Eclipse Public License — dosya bazlı copyleft.' },
  { id: 'EPL-2.0', desc: 'Eclipse Public License 2.0 — GPL uyumlu copyleft.' },
  { id: 'EUPL-1.2', desc: 'Avrupa Birliği Kamu Lisansı.' },
  { id: 'CDDL-1.0', desc: 'Common Development and Distribution License.' },
  { id: 'CDDL-1.1', desc: 'CDDL 1.1 — dosya bazlı copyleft.' },
  { id: 'APSL-2.0', desc: 'Apple Public Source License 2.0.' },
  { id: 'Artistic-2.0', desc: 'Perl ekosistemi için serbest lisans.' },
  { id: 'Zlib', desc: 'Serbest, sadeleştirilmiş (zlib/libpng tarzı).' },
  { id: 'libpng-2.0', desc: 'libpng için zlib tabanlı lisans.' },
  { id: 'WTFPL', desc: 'WTFPL — pratikte her şey serbest.' },
  { id: 'X11', desc: 'X11 lisansı (MIT benzeri).' },
  { id: 'Vim', desc: 'Vim lisansı — değişiklikler açılmalı.' },
  { id: 'W3C', desc: 'W3C Software Notice — kısa ve serbest.' },
  { id: 'NCSA', desc: 'UIUC lisansı — akademik yazılım için.' },
  { id: 'PostgreSQL', desc: 'PostgreSQL lisansı — MIT benzeri.' },
  { id: 'Python-2.0', desc: 'Python lisansı.' },
  { id: 'Ruby', desc: 'Ruby lisansı.' },
  { id: 'OpenSSL', desc: 'OpenSSL/Apache uyumlu lisans.' },
  { id: 'MS-PL', desc: 'Microsoft Public License.' },
  { id: 'MS-RL', desc: 'Microsoft Reciprocal License — dosya bazlı copyleft.' },
  { id: 'LPPL-1.3c', desc: 'LaTeX Project Public License.' },
  { id: 'OSL-3.0', desc: 'Open Software License — ağ copyleft.' },
  { id: 'SSPL-1.0', desc: 'Server Side Public License — servis kullanımı için.' },
  { id: 'BUSL-1.1', desc: 'MariaDB Business Source — ticari kullanım kısıtlı.' },
  { id: 'BSL-1.0-Sun', desc: 'Sun/Oracle Business Source.' },
  { id: 'Elastic-2.0', desc: 'Elastic License — yalnız kendi servisin.' },
  { id: 'CERN-OHL-P-2.0', desc: 'CERN Open Hardware — patent açık.' },
  { id: 'CERN-OHL-S-2.0', desc: 'CERN Open Hardware — güçlü copyleft.' },
  { id: 'CERN-OHL-1.2', desc: 'CERN Open Hardware License 1.2.' },
  { id: 'BlueOak-1.0.0', desc: 'Blue Oak Model License — kısa ve serbest.' },
  { id: 'CC-BY-SA-3.0', desc: 'Atıf + aynı lisansla paylaşım (3.0).' },
  { id: 'CDLA-Sharing-1.0', desc: 'Veri lisansı — paylaşım şartlı.' },
  { id: 'ODbL-1.0', desc: 'Open Database License — veritabanı için copyleft.' },
  { id: 'IPL-1.0', desc: 'IBM Public License.' },
  { id: 'EUPL-1.1', desc: 'Avrupa Birliği Kamu Lisansı 1.1.' },
  { id: 'MulanPSL-2.0', desc: 'Mulan Permissive Software License 2.0.' },
  { id: 'OSL-2.1', desc: 'Open Software License 2.1.' },
  { id: 'QPL-1.0', desc: 'Q Public License.' },
  { id: 'SISSL', desc: 'Sun Industry Standards Source License.' },
  { id: 'Sleepycat', desc: 'Berkeley DB lisansı.' },
  { id: 'UPL-1.0', desc: 'Universal Permissive License.' },
  { id: 'Xnet', desc: 'X.Net lisansı.' },
  { id: 'ZPL-2.0', desc: 'Zope Public License 2.0.' },
  { id: 'ZPL-2.1', desc: 'Zope Public License 2.1.' },
  { id: 'PSF-2.0', desc: 'Python Software Foundation License.' },
  { id: 'NPL-1.0', desc: 'Netscape Public License 1.0.' },
  { id: 'APSL-1.0', desc: 'Apple Public Source License 1.0.' },
  { id: 'AFL-3.0', desc: 'Academic Free License 3.0.' },
  { id: 'OSL-2.0', desc: 'Open Software License 2.0.' },
  { id: 'QPL-1.0-INRIA-2004', desc: 'INRIA QPL varyantı.' },
  { id: 'SGI-B-2.0', desc: 'SGI Free Software License B 2.0.' },
  { id: 'MirOS', desc: 'MirOS lisansı.' },
  { id: 'IJG', desc: 'IJG (libjpeg) lisansı.' },
  { id: 'ImageMagick', desc: 'ImageMagick lisansı.' },
  { id: 'IPA', desc: 'IPA Font License.' },
  { id: 'TCL', desc: 'TCL/Tk lisansı.' },
  { id: 'Beerware', desc: 'Beerware — ciddi olmayan ama yaygın.' },
  { id: 'curl', desc: 'curl lisansı (MIT benzeri).' },
  { id: 'HPND', desc: 'Historical Permission Notice and Disclaimer.' },
  { id: 'ICU', desc: 'ICU lisansı.' },
  { id: 'NTP', desc: 'NTP lisansı.' },
  { id: 'Zend-2.0', desc: 'Zend License 2.0.' },
  { id: 'Batchfile', desc: 'Windows toplu iş (.bat) betiği — özgün bir lisans değil.' },
  { id: 'ActivaterWindows', desc: 'Activator araçları için özgün (SPDX kayıtlı) lisans.' },
  { id: 'Proprietary', desc: 'Tüm hakları saklıdır — kapalı kaynak.' },
  { id: 'Other', desc: 'Listede yok — kendi lisans metnini yaz.' },
]

export function LicensePicker({
  value,
  onChange,
  label = 'Lisans',
}: {
  value?: string | null
  onChange: (license: string) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  /*
    Panel TIKLANINCA açılır ve imleç nereye giderse gitsin AÇIK kalır:
    hover ile kapanma YOK. Kapanma: dış tıklama veya ESC.
  */
  useEffect(() => {
    if (!open)
      return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node))
        setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle)
      return LICENSES
    return LICENSES.filter(l =>
      l.id.toLowerCase().includes(needle) || l.desc.toLowerCase().includes(needle),
    )
  }, [q])

  const current = LICENSES.find(l => l.id === value)

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-2">
        <Button
          variant="bordered"
          size="sm"
          onPress={() => setOpen(o => !o)}
          aria-expanded={open}
          startContent={<Icon icon="mdi:scale-balance" width={16} height={16} />}
        >
          {value || label}
        </Button>
        {/* ⓘ — seçili lisansın ne olduğunu söyler */}
        <button
          type="button"
          aria-label="Lisans ne demek?"
          title={current?.desc ?? 'Lisans seçilmedi'}
          onClick={() => setOpen(o => !o)}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <Icon icon="mdi:information-outline" width={16} height={16} />
        </button>
      </div>

      {current && (
        <p className="mt-1 text-[11px] leading-4 text-foreground-500">
          {current.desc}
        </p>
      )}

      {open && (
        <div className="absolute left-0 z-40 mt-1 w-72 overflow-hidden rounded-xl border border-foreground/15 bg-background shadow-2xl shadow-black/20">
          <div className="border-b border-foreground/10 p-2">
            <Input
              value={q}
              onValueChange={setQ}
              placeholder="Lisans ara..."
              aria-label="Lisans ara"
              className="h-8"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto p-1.5">
            {filtered.map(l => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(l.id)
                    setOpen(false)
                    setQ('')
                  }}
                  className={`flex w-full cursor-pointer flex-col items-start rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                    l.id === value
                      ? 'bg-primary/15 text-primary'
                      : 'text-foreground/80 hover:bg-foreground/10 hover:text-foreground'
                  }`}
                >
                  <span className="text-xs font-semibold">{l.id}</span>
                  <span className="text-[10px] leading-4 opacity-70">{l.desc}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-2.5 py-3 text-center text-xs text-foreground/50">Sonuç yok</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
