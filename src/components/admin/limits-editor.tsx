'use client'

import type { AdminUserRow, UserUsage } from '@/lib/admin/users-shared'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DEFAULT_MAX_TOTAL_UPLOAD_BYTES,
  formatMb,
} from '@/lib/admin/users-shared'

/**
 * "Limitler" popover'ı.
 *
 * Normal kullanıcı varsayılanı: TOPLAM 1 MB yükleme kotası, SINIRSIZ mesaj.
 * `null` = sınırsız — `0` DEĞİL (0 her şeyi keser). Site sahibi/admin
 * kotasız (sunucuda `isUnlimited`).
 *
 * Kullanım `chat_messages`'tan toplanır (disk taraması yok); dosya
 * silinince düşer. Bar tek yerde: `/api/admin/users?usage=<id>`.
 */

interface UsageResponse {
  usage: UserUsage
  limits: { maxTotalUploadBytes: number | null, maxMessages: number | null }
  unlimited: boolean
}

export function LimitsEditor({
  user,
  onSave,
  busy,
}: {
  user: AdminUserRow
  onSave: (limits: { maxTotalUploadBytes: number | null, maxMessages: number | null }) => void
  busy: boolean
}) {
  const storedBytes = user.limits.maxTotalUploadBytes
  const [uploadMb, setUploadMb] = useState(
    storedBytes === null || storedBytes === undefined
      ? ''
      : String(storedBytes / 1_048_576),
  )
  const [uploadUnlimited, setUploadUnlimited] = useState(storedBytes === null)
  const [messages, setMessages] = useState(
    user.limits.maxMessages == null ? '' : String(user.limits.maxMessages),
  )
  const [messagesUnlimited, setMessagesUnlimited] = useState(
    user.limits.maxMessages == null,
  )
  const [info, setInfo] = useState<UsageResponse | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/admin/users?usage=${encodeURIComponent(user.id)}`, {
      cache: 'no-store',
    })
      .then(r => r.json())
      .then((data) => {
        if (alive && data.success) {
          setInfo(data as UsageResponse)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [user.id])

  const usedBytes = info?.usage.uploadBytes ?? 0
  // `null` = sınırsız (admin ya da kullanıcıya özel sınırsız).
  const limitBytes = info
    ? info.unlimited
      ? null
      : info.limits.maxTotalUploadBytes
    : DEFAULT_MAX_TOTAL_UPLOAD_BYTES
  const pct
    = limitBytes && limitBytes > 0
      ? Math.min(100, Math.round((usedBytes / limitBytes) * 100))
      : 0

  const save = () => {
    const bytes = uploadUnlimited
      ? null
      : Math.round(Number(uploadMb || '0') * 1_048_576)
    const maxMessages = messagesUnlimited ? null : Number(messages || '0')
    onSave({ maxTotalUploadBytes: bytes, maxMessages })
  }

  const resetDefaults = () => {
    setUploadUnlimited(false)
    setUploadMb(String(DEFAULT_MAX_TOTAL_UPLOAD_BYTES / 1_048_576))
    setMessagesUnlimited(true)
    setMessages('')
  }

  return (
    <div className="w-72 px-1 py-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground-500">Limitler</p>
        <Button size="sm" variant="light" onPress={resetDefaults}>
          Varsayılana dön
        </Button>
      </div>

      {/* Kaydet EN ÜSTTE (2026-10-19, kullanıcı isteği) — uzun formda dibe
          inmek gerekiyordu. Alt kopya kaldırıldı. */}
      <Button
        size="sm"
        color="primary"
        className="mb-3 w-full"
        isDisabled={busy}
        onPress={save}
      >
        Kaydet
      </Button>

      <div className="mb-3 rounded-lg border border-foreground-200/10 p-2">
        <div className="mb-1 flex justify-between text-[11px] text-foreground-500">
          <span>Toplam yükleme kullanımı</span>
          <span>
            {formatMb(usedBytes)}
{' '}
/
{' '}
            {limitBytes === null ? 'sınırsız' : formatMb(limitBytes)}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className={`h-full rounded-full ${pct >= 100 ? 'bg-danger' : 'bg-primary'}`}
            style={{ width: `${limitBytes === null ? 0 : pct}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-foreground-500">
          {info?.usage.uploadCount ?? 0}
{' '}
dosya ·
{info?.usage.messageCount ?? 0}
{' '}
          mesaj
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-foreground-500">
            Toplam yükleme kotası (MB)
          </span>
          <Input
            variant="faded"
            type="number"
            placeholder="örn. 1"
            value={uploadMb}
            isDisabled={uploadUnlimited}
            onValueChange={setUploadMb}
          />
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-[var(--primary)]"
              checked={uploadUnlimited}
              onChange={e => setUploadUnlimited(e.target.checked)}
            />
            Sınırsız
          </span>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-foreground-500">Mesaj sınırı (toplam)</span>
          <Input
            variant="faded"
            type="number"
            placeholder="örn. 500"
            value={messages}
            isDisabled={messagesUnlimited}
            onValueChange={setMessages}
          />
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-[var(--primary)]"
              checked={messagesUnlimited}
              onChange={e => setMessagesUnlimited(e.target.checked)}
            />
            Sınırsız
          </span>
        </label>
      </div>
    </div>
  )
}
