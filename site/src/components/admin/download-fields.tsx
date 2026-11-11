'use client'

import { Icon } from '@iconify/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'

/**
 * İndirme alanları (2026-11-11) — proje modalında ORTAK kullanılır.
 *
 * · 1. combobox: platform · 2. combobox: varyant (platforma göre özelleşir)
 * · "Hepsi" seçiliyken varyant combobox'u gizlenir
 * · "+" ile satır eklenir; aynı ikili tekrar eklenirse uyarı verilir
 * · "Prompt'u kopyala" → panoya kopyalar VE metni ekranda gösterir
 */

/**
 * Platformlar + her platformun GERÇEK build varyantları.
 *
 * Değerler gerçek release adlandırmalarından doğrulandı:
 *   · Windows  → x86_64 (amd64), x86, arm64 · MSI · EXE · ZIP
 *   · macOS    → universal2 · arm64 · x86_64 · DMG · ZIP
 *   · Linux    → amd64 · arm64/aarch64 · i686 · DEB · RPM · AppImage · SNAP · TAR.GZ
 *   · Ubuntu   → amd64 · arm64 · armhf · i386 · DEB · SNAP
 *   · Android  → arm64-v8a · armeabi-v7a · x86_64 · x86 · APK · AAB
 *   · iOS      → arm64 · x86_64 · IPA
 */
export const DOWNLOAD_PLATFORM_OPTIONS: {
  value: string
  label: string
  variants: { value: string, label: string }[]
}[] = [
  {
    value: 'hepsi',
    label: 'Hepsi',
    variants: [
      { value: 'hepsi', label: 'Hepsi' },
      { value: 'universal', label: 'Universal (tek dosya)' },
      { value: 'x64', label: 'x64 (64-bit)' },
      { value: 'x86', label: 'x86 (32-bit)' },
      { value: 'arm64', label: 'arm64' },
    ],
  },
  {
    value: 'windows',
    label: 'Windows',
    variants: [
      { value: 'hepsi', label: 'Hepsi' },
      { value: 'x64', label: 'x64 / x86_64 (64-bit)' },
      { value: 'x86', label: 'x86 (32-bit)' },
      { value: 'arm64', label: 'arm64' },
      { value: 'msi', label: 'MSI (kurulum)' },
      { value: 'exe', label: 'EXE (kurulum)' },
      { value: 'zip', label: 'ZIP (taşınabilir)' },
    ],
  },
  {
    value: 'macos',
    label: 'macOS',
    variants: [
      { value: 'hepsi', label: 'Hepsi' },
      { value: 'universal', label: 'Universal (Intel + Apple Silicon)' },
      { value: 'arm64', label: 'arm64 (Apple Silicon)' },
      { value: 'x64', label: 'x86_64 (Intel)' },
      { value: 'dmg', label: 'DMG (disk görüntüsü)' },
      { value: 'zip', label: 'ZIP (taşınabilir)' },
    ],
  },
  {
    value: 'linux',
    label: 'Linux',
    variants: [
      { value: 'hepsi', label: 'Hepsi' },
      { value: 'x64', label: 'x86_64 / amd64 (64-bit)' },
      { value: 'arm64', label: 'aarch64 / arm64' },
      { value: 'x86', label: 'i686 (32-bit)' },
      { value: 'deb', label: 'DEB (Debian/Ubuntu)' },
      { value: 'rpm', label: 'RPM (Fedora/RHEL)' },
      { value: 'appimage', label: 'AppImage (taşınabilir)' },
      { value: 'snap', label: 'SNAP' },
      { value: 'tar', label: 'TAR.GZ (kaynak arşivi)' },
    ],
  },
  {
    value: 'ubuntu',
    label: 'Ubuntu',
    variants: [
      { value: 'hepsi', label: 'Hepsi' },
      { value: 'amd64', label: 'amd64 (64-bit)' },
      { value: 'arm64', label: 'arm64 (64-bit)' },
      { value: 'armhf', label: 'armhf (32-bit ARM)' },
      { value: 'i386', label: 'i386 (32-bit)' },
      { value: 'deb', label: 'DEB (paket)' },
      { value: 'snap', label: 'SNAP' },
    ],
  },
  {
    value: 'android',
    label: 'Android',
    variants: [
      { value: 'hepsi', label: 'Hepsi' },
      { value: 'arm64', label: 'arm64-v8a' },
      { value: 'arm', label: 'armeabi-v7a' },
      { value: 'x64', label: 'x86_64' },
      { value: 'x86', label: 'x86' },
      { value: 'apk', label: 'APK' },
      { value: 'aab', label: 'AAB (App Bundle)' },
    ],
  },
  {
    value: 'ios',
    label: 'iOS / iPadOS',
    variants: [
      { value: 'hepsi', label: 'Hepsi' },
      { value: 'arm64', label: 'arm64 (cihaz)' },
      { value: 'x64', label: 'x86_64 (simülatör)' },
      { value: 'ipa', label: 'IPA' },
    ],
  },
]

/** Cihaz adı → kartın per-os anahtarı (Ubuntu = Linux). */
export const DEVICE_OS_KEYS: Record<string, 'windows' | 'macos' | 'linux' | 'ios' | 'android'> = {
  windows: 'windows',
  macos: 'macos',
  linux: 'linux',
  ubuntu: 'linux',
  android: 'android',
  ios: 'ios',
}

export function downloadPlatformLabel(value: string): string {
  return DOWNLOAD_PLATFORM_OPTIONS.find(p => p.value === value)?.label ?? value
}

export function downloadVariantLabel(platform: string, variant: string): string {
  const p = DOWNLOAD_PLATFORM_OPTIONS.find(x => x.value === platform)
  return p?.variants.find(v => v.value === variant)?.label ?? variant
}

/** Tarayıcının algıladığı cihaz (Chrome `userAgentData.platform` → eski: userAgent). */
export function detectDevice(): string {
  if (typeof navigator === 'undefined')
    return 'linux'
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  const ua = nav.userAgentData?.platform ?? nav.userAgent ?? ''
  if (/win/i.test(ua))
    return 'windows'
  if (/android/i.test(ua))
    return 'android'
  if (/iphone|ipad|ipod/i.test(ua))
    return 'ios'
  if (/mac/i.test(ua))
    return 'macos'
  return 'linux'
}

export interface DownloadRow {
  device: string
  version: string
  url: string
}

export function DownloadFields({
  platform,
  variant,
  rows,
  onChange,
  onWarn,
}: {
  platform: string
  variant: string
  rows: DownloadRow[]
  onChange: (patch: { platform?: string, variant?: string, rows?: DownloadRow[] }) => void
  /** Aynı platform+varyant tekrar eklenirse uyarı metni. */
  onWarn?: (message: string) => void
}) {
  const [detectedDevice, setDetectedDevice] = useState('')
  const [promptText, setPromptText] = useState('')

  useEffect(() => {
    setDetectedDevice(detectDevice())
  }, [])

  const addRow = () => {
    if (rows.some(r => r.device === platform && r.version === variant)) {
      onWarn?.(`${downloadPlatformLabel(platform)} · ${downloadVariantLabel(platform, variant)} zaten ekli.`)
      return
    }
    onChange({ rows: [...rows, { device: platform, version: variant, url: '' }] })
  }

  const updateRow = (device: string, version: string, url: string) => {
    onChange({
      rows: rows.map(r => (r.device === device && r.version === version ? { ...r, url } : r)),
    })
  }

  const removeRow = (device: string, version: string) => {
    onChange({ rows: rows.filter(r => !(r.device === device && r.version === version)) })
  }

  const copyPrompt = async () => {
    const lines = rows.length > 0
      ? rows
          .map((r, i) => {
            const head = `${i + 1}. ${r.device === 'hepsi' ? 'all' : r.device}${r.version && r.version !== 'hepsi' ? ` — ${r.version}` : ''}`
            return r.url ? `${head} — ${r.url}` : head
          })
          .join('\n')
      : '- (no rows yet)'
    const prompt = [
      'Put this in the first box:',
      lines,
      '',
      'Keep every device name and version format exactly as written.',
      `At the end of the prompt, write the device name (for example: ${detectDevice()}).`,
    ].join('\n')
    setPromptText(prompt)
    try {
      await navigator.clipboard.writeText(prompt)
    }
    catch {
      /* pano izni yok → metin ekranda görünüyor, elle kopyalanır */
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-stretch gap-2">
        {/* 1. combobox: platform */}
        <SearchableCombobox
          multiple={false}
          options={DOWNLOAD_PLATFORM_OPTIONS.map(p => ({ value: p.value, label: p.label }))}
          selected={[platform]}
          onSelect={v => onChange({ platform: v, variant: 'hepsi' })}
          onClear={() => onChange({ platform: 'hepsi', variant: 'hepsi' })}
          placeholder="Hepsi"
          searchPlaceholder="Platform ara..."
          ariaLabel="İndirme platformunu seç"
        />
        {/* 2. combobox: varyant — "Hepsi" seçiliyken gizlenir */}
        {platform !== 'hepsi' && (
          <SearchableCombobox
            multiple={false}
            options={(
              DOWNLOAD_PLATFORM_OPTIONS.find(p => p.value === platform)?.variants ?? []
            ).map(v => ({ value: v.value, label: v.label }))}
            selected={[variant]}
            onSelect={v => onChange({ variant: v })}
            onClear={() => onChange({ variant: 'hepsi' })}
            placeholder="Hepsi"
            searchPlaceholder="Varyant ara..."
            ariaLabel="Build varyantını seç"
          />
        )}
        <button
          type="button"
          onClick={addRow}
          aria-label="İndirme linki ekle"
          title="İndirme linki ekle"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-foreground/15 text-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon icon="mdi:plus" width={18} height={18} />
        </button>
      </div>

      {detectedDevice && (
        <p className="mt-1 text-[11px] text-foreground-500">
          {'Bu tarayıcı: '}
          <button
            type="button"
            onClick={() => onChange({ platform: detectedDevice, variant: 'hepsi' })}
            className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
          >
            {detectedDevice}
          </button>
        </p>
      )}

      {rows.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {rows.map(row => (
            <li key={`${row.device}:${row.version}`} className="flex items-center gap-2">
              <span className="w-36 shrink-0 truncate text-xs font-semibold text-foreground/70">
                {downloadPlatformLabel(row.device)}
                {row.version ? ` · ${downloadVariantLabel(row.device, row.version)}` : ''}
              </span>
              <Input
                className="min-w-0 flex-1"
                variant="faded"
                value={row.url}
                onValueChange={v => updateRow(row.device, row.version, v)}
                placeholder="https://..."
                aria-label={`${downloadPlatformLabel(row.device)} indirme linki`}
              />
              <button
                type="button"
                onClick={() => removeRow(row.device, row.version)}
                aria-label="Bu indirme satırını kaldır"
                title="Kaldır"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground/50 transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <Icon icon="mdi:close" width={16} height={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <>
          <Button
            size="sm"
            variant="bordered"
            className="mt-2"
            onPress={() => void copyPrompt()}
            startContent={<Icon icon="mdi:content-copy" width={14} height={14} />}
          >
            Prompt&apos;u kopyala
          </Button>
          <p className="mt-1 text-[11px] text-foreground-500">
            Bu metni yapay zekâya yapıştır — indirme linkleri buradan gelir.
          </p>
          {promptText && (
            <textarea
              readOnly
              value={promptText}
              rows={6}
              onFocus={e => e.currentTarget.select()}
              className="mt-1 w-full resize-y rounded-md border border-foreground/15 bg-transparent px-3 py-2 font-mono text-[11px] leading-4 text-foreground/80 outline-none focus-visible:border-primary"
            />
          )}
        </>
      )}
    </div>
  )
}
