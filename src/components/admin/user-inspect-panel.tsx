'use client'

import type { UserUsage } from '@/lib/admin/users-shared'
import { Icon } from '@iconify/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { formatMb } from '@/lib/admin/users-shared'
import { PERMISSION_GROUPS } from '@/lib/permissions'

/**
 * "İncele" paneli — YALNIZCA Site Sahibi (`role === owner`).
 *
 * · Kullanıcıya ait TÜM kayıtlı bilgiler salt okunur gösterilir.
 * · `profiles` alanları ŞEMADAN DİNAMİK çıkar (`select('*')` → yeni sütun
 *   eklenince kendiliğinden görünür); gizli/kimlik kolonları sunucuda
 *   süzülür (`sanitizeProfile`).
 * · Her alanın yanında "Kopyala".
 * · ŞİFRE: hash'li saklanır → düz metin GÖSTERİLMEZ, hash de gösterilmez.
 *   Yalnız "hash'li saklanıyor" + son güncelleme tarihi + "Şifre Sıfırla".
 * · Her açılış `audit_log`'a yazılır (sunucuda).
 * · Esc ve dışarı tıklama kapatır (Drawer).
 */

interface InspectPayload {
  id: string
  email: string | null
  phone: string | null
  username: string | null
  fullName: string | null
  role: 'admin' | 'user'
  isOwner: boolean
  roles: string[]
  permissions: string[]
  limits: Record<string, unknown>
  createdAt: string | null
  lastSignIn: string | null
  usage?: UserUsage
  profile?: Record<string, unknown>
  auth?: Record<string, unknown>
  password?: { stored: string, updatedAt: string | null }
}

const PERM_LABEL: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => [p.id, p.label])),
)

const DATE_FMT: Intl.DateTimeFormatOptions = {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}

/** Türkçe tarih-saat; boş/geçersiz → "—". Hydration güvenli (sabit locale). */
export function formatDateTime(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return '—'
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('tr-TR', DATE_FMT)
}

export function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') {
    return '—'
  }
  if (typeof v === 'boolean') {
    return v ? 'Evet' : 'Hayır'
  }
  if (Array.isArray(v)) {
    return v.length ? v.map(x => String(x)).join(', ') : '—'
  }
  if (typeof v === 'object') {
    return JSON.stringify(v)
  }
  return String(v)
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label="Kopyala"
      title={copied ? 'Kopyalandı' : 'Kopyala'}
      className="shrink-0 rounded-md p-1 text-foreground-500 transition-colors hover:bg-foreground/5 hover:text-foreground"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          },
          () => {},
        )
      }}
    >
      <Icon
        icon={copied ? 'material-symbols:check' : 'material-symbols:content-copy-outline'}
        width={14}
        height={14}
      />
    </button>
  )
}

function Row({ label, value, mono }: { label: string, value: string, mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 border-b border-foreground-200/5 py-1.5 last:border-0">
      <span className="w-40 shrink-0 text-[11px] text-foreground-500">{label}</span>
      <span
        className={`min-w-0 flex-1 break-words text-xs ${mono ? 'font-mono' : ''} ${
          value === '—' ? 'text-foreground-500/60' : ''
        }`}
      >
        {value}
      </span>
      {value !== '—' && <CopyButton value={value} />}
    </div>
  )
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <section className="mb-3 rounded-xl border border-foreground-200/10 p-3">
      <p className="mb-1 text-xs font-semibold text-primary">{title}</p>
      {children}
    </section>
  )
}

function formatLimits(limits: Record<string, unknown>): string {
  const parts: string[] = []
  const bytes = limits.maxTotalUploadBytes
  parts.push(
    bytes === null
      ? 'Toplam yükleme: sınırsız'
      : `Toplam yükleme: ${formatMb(Number(bytes))}`,
  )
  parts.push(
    limits.maxMessages === null || limits.maxMessages === undefined
      ? 'Mesaj: sınırsız'
      : `Mesaj: ${limits.maxMessages}`,
  )
  if (limits.fileMaxMb != null) {
    parts.push(`Tek dosya: ${limits.fileMaxMb} MB`)
  }
  if (limits.dailyMessages != null) {
    parts.push(`Günlük mesaj: ${limits.dailyMessages}`)
  }
  return parts.join(' · ')
}

export function UserInspectPanel({
  userId,
  onClose,
  onResetPassword,
}: {
  userId: string | null
  onClose: () => void
  onResetPassword: (userId: string) => void
}) {
  return (
    <Drawer
      open={!!userId}
      onClose={onClose}
      title="Kullanıcı İnceleme"
      ariaLabel="Kullanıcı inceleme"
    >
      {userId && (
        <InspectBody
          key={userId}
          userId={userId}
          onResetPassword={onResetPassword}
        />
      )}
    </Drawer>
  )
}

function InspectBody({
  userId,
  onResetPassword,
}: {
  userId: string
  onResetPassword: (userId: string) => void
}) {
  const [user, setUser] = useState<InspectPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [auditId, setAuditId] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/admin/users?inspect=${encodeURIComponent(userId)}`, {
      cache: 'no-store',
    })
      .then(r => r.json())
      .then((data) => {
        if (!alive) {
          return
        }
        if (data.success && data.user) {
          setUser(data.user as InspectPayload)
          setAuditId(data.auditId ?? null)
        }
        else {
          setError(data.message || 'Kullanıcı okunamadı.')
        }
      })
      .catch(() => alive && setError('Kullanıcı okunamadı (ağ hatası).'))
    return () => {
      alive = false
    }
  }, [userId])

  if (error) {
    return (
      <div className="px-5 py-6 text-sm text-danger" role="alert">
        {error}
      </div>
    )
  }
  if (!user) {
    return <p className="px-5 py-6 text-sm text-foreground-500">Yükleniyor…</p>
  }

  const usage = user.usage
  const limitBytes = user.limits?.maxTotalUploadBytes
  const unlimited = user.isOwner || user.roles.includes('admin')
  const usedBytes = usage?.uploadBytes ?? 0
  const pct
    = !unlimited && typeof limitBytes === 'number' && limitBytes > 0
      ? Math.min(100, Math.round((usedBytes / limitBytes) * 100))
      : 0

  const auth = user.auth ?? {}
  const identityParts = Array.isArray(auth.identities)
    ? (auth.identities as string[])
    : []
  const metadata = (auth.metadata ?? {}) as Record<string, unknown>

  return (
    <div className="px-5 py-4">
      <Section title="Kimlik">
        <Row label="Kullanıcı ID" value={user.id} mono />
        <Row label="Ad Soyad" value={formatValue(user.fullName)} />
        <Row label="Kullanıcı adı" value={formatValue(user.username)} />
        <Row label="E-posta" value={formatValue(user.email)} />
        <Row label="Telefon" value={formatValue(user.phone)} />
        <Row
          label="Rol"
          value={user.isOwner ? 'Site Sahibi' : user.role}
        />
        <Row
          label="Roller"
          value={formatValue(user.roles.length ? user.roles : null)}
        />
        <Row label="Hesap durumu" value="Aktif" />
      </Section>

      {user.profile && (
        <Section title="Profil (şemadan dinamik)">
          {Object.entries(user.profile).map(([k, v]) => (
            <Row key={k} label={k} value={formatValue(v)} mono={k === 'id'} />
          ))}
        </Section>
      )}

      <Section title="Özel Yetkiler">
        {user.permissions.length === 0 ? (
          <p className="text-xs text-foreground-500">Yetki yok.</p>
        ) : (
          user.permissions.map(id => (
            <Row
              key={id}
              label={id}
              value={PERM_LABEL[id] ?? id}
            />
          ))
        )}
      </Section>

      <Section title="Limitler & Kullanım">
        <Row label="Limitler" value={formatLimits(user.limits)} />
        <Row
          label="Yüklenen dosya"
          value={`${usage?.uploadCount ?? 0} dosya`}
        />
        <Row label="Mesaj sayısı" value={String(usage?.messageCount ?? 0)} />
        <div className="pt-2">
          <div className="mb-1 flex justify-between text-[11px] text-foreground-500">
            <span>Toplam yükleme</span>
            <span>
              {formatMb(usedBytes)}
{' '}
/
{' '}
              {unlimited || limitBytes === null
                ? 'sınırsız'
                : formatMb(Number(limitBytes))}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${unlimited ? 0 : pct}%` }}
            />
          </div>
        </div>
      </Section>

      <Section title="Şifre">
        <Row
          label="Durum"
          value="••••••••  (hash'li saklanıyor, görüntülenemez)"
        />
        <Row
          label="Son güncelleme"
          value={formatDateTime(user.password?.updatedAt)}
        />
        <p className="mt-1 text-[11px] text-foreground-500">
          Şifreler geri çözülemez biçimde (Supabase Auth / bcrypt) saklanır —
          düz metin ve hash değeri API&apos;den hiçbir zaman dönmez.
        </p>
        <Button
          size="sm"
          variant="bordered"
          className="mt-2"
          onPress={() => onResetPassword(user.id)}
        >
          Şifre Sıfırla
        </Button>
      </Section>

      <Section title="Oturum / Cihaz">
        <Row label="Kayıt tarihi" value={formatDateTime(user.createdAt)} />
        <Row label="Son giriş" value={formatDateTime(user.lastSignIn)} />
        <Row
          label="E-posta doğrulama"
          value={formatDateTime(auth.emailConfirmedAt)}
        />
        <Row
          label="Sağlayıcı"
          value={identityParts.length ? identityParts.join(', ') : '—'}
        />
        <Row label="Son IP / cihaz" value="—" />
      </Section>

      {Object.keys(metadata).length > 0 && (
        <Section title="Ek Meta Veri (user_metadata)">
          {Object.entries(metadata).map(([k, v]) => (
            <Row key={k} label={k} value={formatValue(v)} />
          ))}
        </Section>
      )}

      <p className="mt-2 text-[11px] text-foreground-500">
        Bu görüntüleme denetim kaydına yazıldı
        {auditId ? ` (kayıt #${auditId})` : ' (denetim tablosu yok)'}
.
</p>
    </div>
  )
}
