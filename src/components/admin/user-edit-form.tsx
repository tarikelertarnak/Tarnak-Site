'use client'

import { Icon } from '@iconify/react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

/**
 * Kullanıcı profili düzenleme formu (paneldeki "Düzenle").
 *
 * Herkes (kendi profilini), admin (site sahibi dışında herkesi) ve site
 * sahibi (herkesi) kullanabilir — yetki SUNUCUDA zorlanır
 * (`/api/admin/users` action `updateProfile`).
 *
 * ODAK KAYBI ÖNLEMİ: form iç içe bileşen olarak DEĞİL, `EditForm` ayrı
 * bileşen olarak ve `key={userId}` ile basılır. Böylece her tuş vuruşunda
 * yeni bileşen tipi türetilmez (React input'u yeniden kurmaz, odak kaçmaz).
 */

interface EditableUser {
  id: string
  email: string
  phone: string
  fullName: string
  username: string
  avatarUrl: string
  bio: string
  occupation: string
  occupationOther: string
  contactEmail: string
  location: string
  discord: string
}

interface Props {
  /** Düzenlenecek kullanıcı; `null` → kapalı. */
  userId: string | null
  onClose: () => void
  onSaved: () => void
}

export function UserEditForm({ userId, onClose, onSaved }: Props) {
  return (
    <Drawer
      open={!!userId}
      onClose={onClose}
      title="Profili Düzenle"
      ariaLabel="Profili düzenle"
    >
      {userId && (
        <EditForm
          key={userId}
          userId={userId}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Drawer>
  )
}

type FieldKey = Exclude<keyof EditableUser, 'id'>

const FIELDS: Array<{
  key: FieldKey
  label: string
  type?: string
  hint?: string
  textarea?: boolean
}> = [
  { key: 'fullName', label: 'Ad Soyad' },
  { key: 'username', label: 'Kullanıcı adı', hint: 'Harf, rakam, nokta, tire, alt çizgi' },
  { key: 'email', label: 'E-posta', type: 'email' },
  { key: 'phone', label: 'Telefon', type: 'tel', hint: 'Yalnız rakam, en fazla 15 hane' },
  { key: 'occupation', label: 'Meslek' },
  { key: 'occupationOther', label: 'Meslek (diğer)' },
  { key: 'contactEmail', label: 'İletişim e-postası', type: 'email' },
  { key: 'location', label: 'Konum' },
  { key: 'discord', label: 'Discord' },
  { key: 'avatarUrl', label: 'Profil fotoğrafı (URL)', hint: 'https://…' },
  { key: 'bio', label: 'Biyografi', textarea: true },
]

function EditForm({
  userId,
  onClose,
  onSaved,
}: {
  userId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<EditableUser | null>(null)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(`/api/admin/users?edit=${encodeURIComponent(userId)}`, {
      cache: 'no-store',
    })
      .then(r => r.json())
      .then((data) => {
        if (!alive) {
          return
        }
        if (data.success && data.editable) {
          setForm(data.editable as EditableUser)
        }
        else {
          setBanner(data.message || 'Profil yüklenemedi.')
        }
      })
      .catch(() => alive && setBanner('Profil yüklenemedi (ağ hatası).'))
    return () => {
      alive = false
    }
  }, [userId])

  const set = useCallback((key: FieldKey, value: string) => {
    setForm(prev => (prev ? { ...prev, [key]: value } : prev))
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }, [])

  const save = async () => {
    if (!form) {
      return
    }
    setBusy(true)
    setBanner(null)
    setErrors({})
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateProfile', userId, ...form }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onSaved()
        onClose()
      }
      else if (data.fieldErrors) {
        setErrors(data.fieldErrors as Partial<Record<FieldKey, string>>)
        setBanner(data.message || 'Doğrulama hatası.')
      }
      else {
        setBanner(data.message || 'Kaydedilemedi.')
      }
    }
    catch {
      setBanner('Kaydedilemedi (ağ hatası).')
    }
    finally {
      setBusy(false)
    }
  }

  if (!form) {
    return (
      <p className="px-5 py-6 text-sm text-foreground-500">
        {banner || 'Yükleniyor…'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {banner && (
        <div className="flex items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm font-medium text-danger">
          <Icon icon="material-symbols:error" width={16} height={16} />
          {banner}
        </div>
      )}
      {FIELDS.map((f) => {
        const value = form[f.key] ?? ''
        if (f.textarea) {
          return (
            <Textarea
              key={f.key}
              label={f.label}
              value={value}
              onValueChange={v => set(f.key, v)}
              minRows={3}
              maxRows={8}
              isInvalid={!!errors[f.key]}
              errorMessage={errors[f.key]}
            />
          )
        }
        return (
          <Input
            key={f.key}
            label={f.label}
            type={f.type ?? 'text'}
            variant="faded"
            value={value}
            onValueChange={v => set(f.key, v)}
            isInvalid={!!errors[f.key]}
            errorMessage={errors[f.key] ?? f.hint}
          />
        )
      })}
      <div className="mt-1 flex gap-2">
        <Button
          color="primary"
          className="flex-1"
          isDisabled={busy}
          onPress={save}
        >
          Kaydet
        </Button>
        <Button variant="light" isDisabled={busy} onPress={onClose}>
          Vazgeç
        </Button>
      </div>
    </div>
  )
}
