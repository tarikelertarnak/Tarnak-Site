'use client'

import { Icon } from '@iconify/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { cn } from '@/components/ui/cn'
import { PhoneInput, parsePhone, EMPTY_PHONE } from '@/components/ui/phone-input'
import type { SessionUser } from '@/lib/supabase/session'

/**
 * Profil düzenleme — sağdan açılan drawer.
 * Alanlar: profil fotoğrafı (link), ad, telefon, iletişim bilgileri,
 * meslek/rol combobox ("iş veren" gibi seçenekler + en sonda "Diğer" →
 * seçilince serbest textbox açılır). "Hesap değiştir" aynı drawer'da.
 */
const OCCUPATION_OPTIONS = [
  'İş veren',
  'İş arayan',
  'Öğrenci',
  'Öğretmen',
  'Serbest çalışan',
  'Emekli',
  'Diğer',
] as const

interface ProfileEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: SessionUser | null
  /** Profil kaydedildikten sonra çağrılır — parent session state'ini tazeler. */
}

export function ProfileEditDrawer({
  open,
  onOpenChange,
  user,
}: ProfileEditDrawerProps) {
  const { t } = useT()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [phoneValue, setPhoneValue] = useState(EMPTY_PHONE)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [contact, setContact] = useState('')
  const [occupation, setOccupation] = useState('')
  const [occupationOther, setOccupationOther] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err', text: string } | null>(null)

  // Drawer açılınca mevcut profille doldur
  useEffect(() => {
    if (!open) {
      return
    }
    setFullName(user?.fullName ?? '')
    setPhoneValue(parsePhone(user?.phone ?? ''))
    setAvatarUrl(user?.avatarUrl ?? '')
    setContact(user?.contact ?? '')
    setOccupation(user?.occupation ?? '')
    setOccupationOther(user?.occupationOther ?? '')
    setMessage(null)
  }, [open, user])

  const isOccupationCustom = occupation === 'Diğer'

  const save = useCallback(async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone: (phoneValue.code || phoneValue.number)
        ? `+${phoneValue.code}${phoneValue.number}`
        : '',
          avatarUrl,
          contact,
          occupation,
          occupationOther: isOccupationCustom ? occupationOther : '',
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setMessage({ type: 'err', text: data?.message || t('auth.genericError') })
        return
      }
      setMessage({ type: 'ok', text: t('profile.saved') })
      router.refresh()
      // state'i güncelle — drawer açıkken güncel görünsün
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session:changed'))
      }
    }
    catch {
      setMessage({ type: 'err', text: t('auth.genericError') })
    }
    finally {
      setSaving(false)
    }
  }, [fullName, phoneValue, avatarUrl, contact, occupation, isOccupationCustom, occupationOther, router, t])

  const switchAccount = useCallback(async () => {
    // localStorage'daki Supabase oturumunu da temizle; aksi halde sayfa
    // yenilenince oturum geri gelmiş gibi görünüyor.
    try {
      const { createClient } = await import('@/lib/supabase/client')
      await (await createClient()).auth.signOut()
    }
    catch {
      /* noop */
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    }
    catch {
      /* noop */
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session:changed'))
    }
    window.location.href = '/login'
  }, [])

  const isAdmin = user?.id?.startsWith('admin:') ?? false

  return (
    <Drawer
      open={open}
      onClose={() => onOpenChange(false)}
      title={t('profile.title')}
      side="right"
    >
      <div className="flex flex-col gap-4 px-5 pb-8">
        {isAdmin
          ? (
              <p className="text-sm text-foreground-500">
                {t('profile.adminNote')}
              </p>
            )
          : (
              <>
                {/* Fotoğraf önizleme + link */}
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                    {avatarUrl.trim()
                      ? <img src={avatarUrl.trim()} alt={fullName || 'avatar'} className="h-full w-full object-cover" />
                      : <Icon icon="mdi:account-circle" width={40} height={40} className="text-foreground/40" />}
                  </div>
                  <Input
                    type="url"
                    label={t('profile.photoUrl')}
                    variant="faded"
                    value={avatarUrl}
                    onValueChange={setAvatarUrl}
                    maxLength={500}
                    placeholder="https://..."
                  />
                </div>

                <Input
                  type="text"
                  label={t('auth.name')}
                  variant="faded"
                  value={fullName}
                  onValueChange={setFullName}
                  maxLength={100}
                />

                <PhoneInput
                  label={t('auth.phone')}
                  value={phoneValue}
                  onChange={setPhoneValue}
                />

                <Input
                  type="text"
                  label={t('profile.contact')}
                  variant="faded"
                  value={contact}
                  onValueChange={setContact}
                  maxLength={300}
                  placeholder={t('profile.contactPlaceholder')}
                />

                {/* Meslek / rol combobox + "Diğer" alt seçeneği */}
                <Field label={t('profile.occupation')}>
                  <div className="flex flex-wrap gap-1.5">
                    {OCCUPATION_OPTIONS.map(o => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setOccupation(occupation === o ? '' : o)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          occupation === o
                            ? 'border-primary/50 bg-primary/15 text-foreground'
                            : 'border-foreground-200/15 text-foreground/70 hover:border-primary/40 hover:text-foreground',
                        )}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                  {isOccupationCustom && (
                    <Input
                      type="text"
                      label={t('profile.occupationOther')}
                      variant="faded"
                      value={occupationOther}
                      onValueChange={setOccupationOther}
                      maxLength={60}
                      placeholder={t('profile.occupationOtherPlaceholder')}
                    />
                  )}
                </Field>

                {message && (
                  <div
                    className={cn(
                      'rounded-lg border p-3 text-sm font-medium',
                      message.type === 'ok'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-danger-200 bg-danger-50 text-danger',
                    )}
                  >
                    {message.text}
                  </div>
                )}

                <Button
                  type="button"
                  color="primary"
                  className="w-full font-semibold"
                  isLoading={saving}
                  isDisabled={saving || !fullName.trim()}
                  onClick={save}
                >
                  {t('profile.save')}
                </Button>

                <div className="my-1 border-t border-white/5" />

                {/* Hesap değiştir — çıkış + giriş sayfası */}
                <button
                  type="button"
                  onClick={switchAccount}
                  className="flex items-center justify-center gap-2 rounded-lg border border-foreground/10 px-3 py-2 text-sm text-foreground/70 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                >
                  <Icon icon="mdi:account-switch" width={16} height={16} />
                  {t('profile.switchAccount')}
                </button>
              </>
            )}
      </div>
    </Drawer>
  )
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs sm:text-sm text-foreground-500">{label}</span>
      {children}
    </div>
  )
}