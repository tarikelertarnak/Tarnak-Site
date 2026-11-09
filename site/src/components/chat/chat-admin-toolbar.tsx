'use client'

/**
 * Sohbet sayfası üst admin düzenleme çubuğu.
 *
 * Sayfa düzenleyici (PageTextEditor) pattern'ını takip eder:
 *  · Üst satır: dil combobox (bayrak + isim + kod) + Kopyala (sola)
 *  · Üst satır sağda: search (sabit) + Kaydet/Sıfırla/Sil (en sağ, yalnız admin)
 *  · Alt satır: düzenlenebilir metin alanı (tam genişlik)
 *  · Hepsi sticky (üstte sabit, kaydırma etkilemez)
 *
 * `Kaydet` / `Sıfırla` / `Sil` butonları yalnız `session.role === 'admin'`
 * olan kullanıcılara görünür.
 */

import { Icon } from '@iconify/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import { Textarea } from '@/components/ui/textarea'
import { NATIVE_NAMES } from '@/lib/i18n'
import { ALL_LOCALES_FLAG, localeFlag } from '@/lib/locale-flags'

export function ChatAdminToolbar({
  configText,
  setConfigText,
  onMessageClick,
}: {
  configText: string
  setConfigText: (value: string) => void
  onMessageClick?: (info: { id: string, className: string }) => void
}) {
  const [locale, setLocale] = useState<string>('tr')
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [sessionChecked, setSessionChecked] = useState<boolean>(false)
  const [lastClickedInfo, setLastClickedInfo] = useState<{ id: string, className: string } | null>(null)

  // Handle message click info from parent
  const handleMessageClick = useCallback((info: { id: string, className: string }) => {
    setLastClickedInfo(info)
    onMessageClick?.(info)
  }, [onMessageClick])

  // Exposed so parent can wire onMessageClick
  const _handleMessageClick = handleMessageClick

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/session')
      .then(r => r.json())
      .then((data) => {
        if (cancelled)
return
        setIsAdmin(data?.user?.role === 'admin')
        setSessionChecked(true)
      })
      .catch(() => {
        if (!cancelled)
setSessionChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const languageOptions = useMemo(() => {
    const option = (
      value: string,
      flag: string,
      name: string,
      hint?: string,
    ) => ({
      value,
      icon: <span className="text-base leading-none" aria-hidden>{flag}</span>,
      searchText: `${name} ${value} ${hint ?? ''} ${flag}`,
      label: (
        <span className="flex items-center gap-1.5">
          <span>{name}</span>
          {hint && (
            <span className="text-[10px] opacity-60">{hint}</span>
          )}
        </span>
      ),
    })

    return [
      option(ALL_LOCALES_FLAG, ALL_LOCALES_FLAG, 'Hepsi', '(tüm dillerde aynı)'),
      option('tr', localeFlag('tr'), NATIVE_NAMES.tr, 'TR'),
      ...(Object.keys(NATIVE_NAMES) as Array<keyof typeof NATIVE_NAMES>)
        .filter(code => code !== 'tr')
        .map(code =>
          option(code, localeFlag(code), NATIVE_NAMES[code], code.toUpperCase()),
        ),
    ]
  }, [])

  const copyConfig = useCallback(() => {
    void navigator.clipboard.writeText(configText)
  }, [configText])

  const adminButtons = isAdmin && sessionChecked ? (
    <>
      <Button
        size="sm"
        color="primary"
        variant="solid"
        onPress={() => {}}
        startContent={<Icon icon="mdi:content-save" width={16} height={16} />}
      >
        Kaydet
      </Button>
      <Button
        size="sm"
        variant="bordered"
        onPress={() => setConfigText('')}
        startContent={<Icon icon="mdi:reload" width={16} height={16} />}
      >
        Sıfırla
      </Button>
      <Button
        size="sm"
        color="danger"
        variant="bordered"
        onPress={() => {}}
        startContent={<Icon icon="mdi:delete" width={16} height={16} />}
      >
        Sil
      </Button>
    </>
  ) : null

  return (
    <div className="sticky top-0 z-50 flex w-full flex-col gap-1 border-b border-foreground-200/10 bg-background/95 backdrop-blur px-3 py-2 sm:px-4 sm:py-2.5">
      {/* Üst satır: dil combobox + Kopyala (sola) | Search + admin butonları (sağa) */}
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <SearchableCombobox
            options={languageOptions}
            selected={[locale]}
            onSelect={setLocale}
            onClear={() => setLocale('tr')}
            placeholder="Dil seç"
            searchPlaceholder="Ara..."
            ariaLabel="Sohbet dili"
          />
          <Button
            size="sm"
            variant="bordered"
            onPress={copyConfig}
            startContent={<Icon icon="mdi:content-copy" width={16} height={16} />}
          >
            Kopyala
          </Button>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-1 max-w-sm gap-1 min-w-0">
            <Input
              variant="faded"
              value=""
              onValueChange={() => {}}
              placeholder="Sohbet arama…"
              aria-label="Sohbet arama"
              className="flex-1 min-w-0"
            />
          </div>
          {adminButtons}
        </div>
      </div>

      {/* Alt satır: düzenlenebilir metin alanı (tam genişlik) */}
      <div className="mt-1 flex w-full flex-col gap-1 min-w-0">
        {lastClickedInfo && (
          <div className="px-2 py-1 text-[10px] font-mono text-foreground/60 bg-foreground/5 rounded border border-foreground-200/10">
            Tıklanan:
{' '}
<span className="text-primary">{lastClickedInfo.id}</span>
{' '}
| class:
{' '}
<span className="text-primary">{lastClickedInfo.className}</span>
          </div>
        )}
        <Textarea
          variant="faded"
          minRows={2}
          value={configText}
          onValueChange={setConfigText}
          placeholder="Sohbet ayarlarını buraya yapıştırın veya düzenleyin…"
          aria-label="Sohbet yapılandırma metni"
          className="w-full min-w-0"
        />
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="bordered"
            onPress={() => setConfigText('')}
          >
            Sıfırla
          </Button>
          <Button size="sm" variant="bordered" onPress={() => {}}>
            Sil
          </Button>
        </div>
      </div>
    </div>
  )
}
