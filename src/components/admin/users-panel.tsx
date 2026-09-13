'use client'

import type { AdminUserRow, UserLimits } from '@/app/api/admin/users/route'
import { Icon } from '@iconify/react'
import { Popover } from '@lobehub/ui'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ALL_PERMISSION_IDS, PERMISSION_GROUPS, ROLE_PRESETS } from '@/lib/permissions'

type Banner = { type: 'success' | 'error', text: string } | null

const roleBadge: Record<string, { label: string, cls: string }> = {
  'admin': { label: 'Admin', cls: 'bg-primary/20 text-primary' },
  'admin-assistant': { label: 'Admin Asistanı', cls: 'bg-violet-500/20 text-violet-300' },
  'trustworthy': { label: 'Güvenilir', cls: 'bg-emerald-500/20 text-emerald-300' },
  'employer': { label: 'İşveren', cls: 'bg-amber-500/20 text-amber-300' },
  'verified': { label: 'Doğrulanmış', cls: 'bg-sky-500/20 text-sky-300' },
  'user': { label: 'User', cls: 'bg-white/10 text-foreground-500' },
}

export function UsersPanel() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null)
  const [banner, setBanner] = useState<Banner>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Edit popovers
  const [rolesFor, setRolesFor] = useState<AdminUserRow | null>(null)
  const [permsFor, setPermsFor] = useState<AdminUserRow | null>(null)
  const [limitsFor, setLimitsFor] = useState<AdminUserRow | null>(null)
  const [draftRoles, setDraftRoles] = useState<string[]>([])
  const [draftPerms, setDraftPerms] = useState<string[]>([])
  const [draftLimits, setDraftLimits] = useState<UserLimits>({})
  const [resetFor, setResetFor] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok && data.success) {
        setUsers(data.users)
      }
      else {
        setBanner({ type: 'error', text: data.message || 'Kullanıcılar yüklenemedi.' })
      }
    }
    catch {
      setBanner({ type: 'error', text: 'Kullanıcılar yüklenemedi (ağ hatası).' })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const act = async (userId: string, init: RequestInit) => {
    setBusyId(userId)
    setBanner(null)
    try {
      const res = await fetch('/api/admin/users', init)
      const data = await res.json()
      if (res.ok && data.success) {
        setBanner({ type: 'success', text: 'Güncellendi.' })
        load()
      }
      else {
        setBanner({ type: 'error', text: data.message || 'İşlem başarısız.' })
      }
    }
    catch {
      setBanner({ type: 'error', text: 'İşlem başarısız (ağ hatası).' })
    }
    finally {
      setBusyId(null)
    }
  }

  const mutate = (userId: string, payload: Record<string, unknown>) =>
    act(userId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

  // Open the role popover
  const openRoles = (u: AdminUserRow) => {
    setDraftRoles([...u.roles])
    setRolesFor(u)
  }
  const saveRoles = () => {
    if (!rolesFor)
      return
    mutate(rolesFor.id, { action: 'setRoles', userId: rolesFor.id, roles: draftRoles })
    setRolesFor(null)
  }

  const openPerms = (u: AdminUserRow) => {
    setDraftPerms([...u.permissions])
    setPermsFor(u)
  }
  const savePerms = () => {
    if (!permsFor)
      return
    mutate(permsFor.id, {
      action: 'setPermissions',
      userId: permsFor.id,
      permissions: draftPerms,
    })
    setPermsFor(null)
  }

  const openLimits = (u: AdminUserRow) => {
    setDraftLimits({
      fileMaxMb: u.limits.fileMaxMb ?? null,
      dailyMessages: u.limits.dailyMessages ?? null,
    })
    setLimitsFor(u)
  }
  const saveLimits = () => {
    if (!limitsFor)
      return
    const clean: UserLimits = {}
    if (draftLimits.fileMaxMb !== null && draftLimits.fileMaxMb !== undefined) {
      clean.fileMaxMb = Number(draftLimits.fileMaxMb)
    }
    if (draftLimits.dailyMessages !== null && draftLimits.dailyMessages !== undefined) {
      clean.dailyMessages = Number(draftLimits.dailyMessages)
    }
    mutate(limitsFor.id, { action: 'setLimits', userId: limitsFor.id, limits: clean })
    setLimitsFor(null)
  }

  // Legacy admin toggle: add/remove admin from the roles set
  const toggleAdmin = (u: AdminUserRow) => {
    const has = u.roles.includes('admin')
    const roles = has
      ? u.roles.filter(r => r !== 'admin')
      : [...u.roles.filter(r => r !== 'user'), 'admin']
    mutate(u.id, { action: 'setRoles', userId: u.id, roles })
  }

  const resetPassword = (u: AdminUserRow) => {
    if (!newPassword.trim() || newPassword.length < 6) {
      setBanner({ type: 'error', text: 'Yeni şifre en az 6 karakter olmalı.' })
      return
    }
    mutate(u.id, { action: 'resetPassword', userId: u.id, password: newPassword })
    setResetFor(null)
    setNewPassword('')
  }

  const remove = (u: AdminUserRow) => {
    if (!window.confirm(`"${u.username || u.email || u.id}" hesabını sil? Bu geri alınamaz.`)) {
      return
    }
    act(u.id, { method: 'DELETE' })
  }

  return (
    <div className="space-y-4 pt-4">
      {banner && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium ${
            banner.type === 'success'
              ? 'border-success-200 bg-success-50 text-success'
              : 'border-danger-200 bg-danger-50 text-danger'
          }`}
        >
          <Icon
            icon={
              banner.type === 'success'
                ? 'material-symbols:check-circle'
                : 'material-symbols:error'
            }
            width={16}
            height={16}
          />
          {banner.text}
        </div>
      )}
      <Card className="bg-background">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-sm font-semibold">Hesap Sahipleri</p>
          <p className="text-xs text-foreground-500">
            Roller hazır gruplardır; tek kullanıcıya birden fazla rol verilebilir.
            Preset dışı yetkiler için &quot;Özel Yetkiler&quot; kullanılır. Site sahibi
            hesabı kilitlidir — hiç kimse değiştiremez veya silemez.
          </p>
        </div>
        {users === null ? (
          <p className="px-4 py-6 text-sm text-foreground-500">Yükleniyor…</p>
        ) : users.length === 0 ? (
          <p className="px-4 py-6 text-sm text-foreground-500">
            Kayıtlı kullanıcı yok (Supabase ayarlı değil veya henüz kayıt yok).
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {users.map((u) => {
              const locked = u.isOwner
              return (
                <li
                  key={u.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.avatarUrl}
                        alt=""
                        width={38}
                        height={38}
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                        {(u.username || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                        <span className="truncate">{u.username || '—'}</span>
                        {locked && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                            🔒 Site Sahibi
                          </span>
                        )}
                        {u.roles.map((r) => {
                          const b = roleBadge[r]
                          if (!b)
                            return null
                          return (
                            <span
                              key={r}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${b.cls}`}
                            >
                              {b.label}
                            </span>
                          )
                        })}
                      </p>
                      <p className="truncate text-xs text-foreground-500">
                        {u.fullName ? `${u.fullName} · ` : ''}
                        {u.email || 'e-posta yok'}
                        {u.phone ? ` · ☎ ${u.phone}` : ''}
                      </p>
                      <p className="truncate text-[11px] text-foreground-500/70">
                        Kayıt:
                        {' '}
                        {u.createdAt ? new Date(u.createdAt).toLocaleString('tr-TR') : '—'}
                        {u.lastSignIn
                          ? ` · Son giriş: ${new Date(u.lastSignIn).toLocaleString('tr-TR')}`
                          : ''}
                        {u.limits.fileMaxMb != null && ` · Dosya ≤ ${u.limits.fileMaxMb}MB`}
                        {u.limits.dailyMessages != null
                          && ` · Günlük mesaj ≤ ${u.limits.dailyMessages}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Popover
                      placement="bottomRight"
                      open={rolesFor?.id === u.id}
                      onOpenChange={(open: boolean) => !open && setRolesFor(null)}
                      trigger="click"
                      content={(
                        <div className="w-64 px-1 py-2">
                          <p className="mb-2 text-xs font-semibold text-foreground-500">
                            Roller (birden fazla seçilebilir)
                          </p>
                          <div className="flex flex-col gap-1">
                            {ROLE_PRESETS.map(r => (
                              <label
                                key={r.id}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                                  draftRoles.includes(r.id)
                                    ? 'border-primary/40 bg-primary/10'
                                    : 'border-foreground-200/10 hover:border-foreground-200/30'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="accent-[var(--primary)]"
                                  checked={draftRoles.includes(r.id)}
                                  onChange={(e) => {
                                    const id = r.id
                                    if (e.target.checked) {
                                      setDraftRoles(prev =>
                                        prev.includes(id) ? prev : [...prev, id],
                                      )
                                    }
                                    else {
                                      setDraftRoles(prev => prev.filter(x => x !== id))
                                    }
                                  }}
                                />
                                <span className="flex flex-col">
                                  <span className="font-semibold">{r.label}</span>
                                  <span className="text-[10px] text-foreground-500">
                                    {r.description}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            color="primary"
                            className="mt-2 w-full"
                            isDisabled={busyId === u.id}
                            onPress={saveRoles}
                          >
                            Kaydet
                          </Button>
                        </div>
                      )}
                    >
                      <Button
                        size="sm"
                        variant="bordered"
                        isDisabled={locked || busyId === u.id}
                        onPress={() => openRoles(u)}
                      >
                        Roller
                      </Button>
                    </Popover>

                    <Popover
                      placement="bottomRight"
                      open={permsFor?.id === u.id}
                      onOpenChange={(open: boolean) => !open && setPermsFor(null)}
                      trigger="click"
                      content={(
                        <div className="max-h-[60vh] w-80 overflow-y-auto px-1 py-2">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground-500">
                              Özel Yetkiler (
                              {draftPerms.length}
                              /
                              {ALL_PERMISSION_IDS.length}
                              )
                            </p>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="light"
                                onPress={() => setDraftPerms([...ALL_PERMISSION_IDS])}
                              >
                                Tümünü Seç
                              </Button>
                              <Button size="sm" variant="light" onPress={() => setDraftPerms([])}>
                                Temizle
                              </Button>
                            </div>
                          </div>
                          {PERMISSION_GROUPS.map((g) => {
                            const ids = g.permissions.map(p => p.id)
                            const allOn = ids.every(id => draftPerms.includes(id))
                            const someOn = ids.some(id => draftPerms.includes(id))
                            return (
                              <div
                                key={g.id}
                                className="mb-2 rounded-xl border border-foreground-200/10 p-2"
                              >
                                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                                  <input
                                    type="checkbox"
                                    className="accent-[var(--primary)]"
                                    checked={allOn}
                                    ref={(el) => {
                                      if (el)
                                        el.indeterminate = someOn && !allOn
                                    }}
                                    onChange={(e) => {
                                      setDraftPerms(prev =>
                                        e.target.checked
                                          ? [...new Set([...prev, ...ids])]
                                          : prev.filter(x => !ids.includes(x)),
                                      )
                                    }}
                                  />
                                  <Icon icon={g.icon} width={14} className="text-primary" />
                                  {g.label}
                                </label>
                                <div className="mt-1.5 flex flex-col gap-0.5 pl-6">
                                  {g.permissions.map(p => (
                                    <label
                                      key={p.id}
                                      className="flex cursor-pointer items-center gap-2 text-xs text-foreground-500 hover:text-foreground"
                                    >
                                      <input
                                        type="checkbox"
                                        className="accent-[var(--primary)]"
                                        checked={draftPerms.includes(p.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setDraftPerms(prev =>
                                              prev.includes(p.id) ? prev : [...prev, p.id],
                                            )
                                          }
                                          else {
                                            setDraftPerms(prev =>
                                              prev.filter(x => x !== p.id),
                                            )
                                          }
                                        }}
                                      />
                                      {p.label}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                          <Button
                            size="sm"
                            color="primary"
                            className="mt-1 w-full"
                            isDisabled={busyId === u.id}
                            onPress={savePerms}
                          >
                            Kaydet
                          </Button>
                        </div>
                      )}
                    >
                      <Button
                        size="sm"
                        variant="bordered"
                        isDisabled={locked || busyId === u.id}
                        onPress={() => openPerms(u)}
                      >
                        Özel Yetkiler
                      </Button>
                    </Popover>

                    <Popover
                      placement="bottomRight"
                      open={limitsFor?.id === u.id}
                      onOpenChange={(open: boolean) => !open && setLimitsFor(null)}
                      trigger="click"
                      content={(
                        <div className="w-64 px-1 py-2">
                          <p className="mb-2 text-xs font-semibold text-foreground-500">
                            Limitler
                          </p>
                          <div className="flex flex-col gap-2">
                            <label className="flex flex-col gap-1 text-xs">
                              <span className="text-foreground-500">
                                Dosya yükleme sınırı (MB) — boş = sınırsız
                              </span>
                              <Input
                                variant="faded"
                                type="number"
                                placeholder="örn. 50"
                                value={String(draftLimits.fileMaxMb ?? '')}
                                onValueChange={v =>
                                  setDraftLimits(prev => ({
                                    ...prev,
                                    fileMaxMb: v === '' ? null : Number(v),
                                  }))}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs">
                              <span className="text-foreground-500">
                                Günlük mesaj sınırı — boş = sınırsız
                              </span>
                              <Input
                                variant="faded"
                                type="number"
                                placeholder="örn. 20"
                                value={String(draftLimits.dailyMessages ?? '')}
                                onValueChange={v =>
                                  setDraftLimits(prev => ({
                                    ...prev,
                                    dailyMessages: v === '' ? null : Number(v),
                                  }))}
                              />
                            </label>
                          </div>
                          <Button
                            size="sm"
                            color="primary"
                            className="mt-2 w-full"
                            isDisabled={busyId === u.id}
                            onPress={saveLimits}
                          >
                            Kaydet
                          </Button>
                        </div>
                      )}
                    >
                      <Button
                        size="sm"
                        variant="bordered"
                        isDisabled={locked || busyId === u.id}
                        onPress={() => openLimits(u)}
                      >
                        Limitler
                      </Button>
                    </Popover>

                    {resetFor === u.id
                      ? (
                          <>
                            <Input
                              variant="faded"
                              type="password"
                              placeholder="Yeni şifre (min 6)"
                              value={newPassword}
                              onValueChange={setNewPassword}
                              className="w-40"
                            />
                            <Button
                              size="sm"
                              color="primary"
                              isDisabled={busyId === u.id}
                              onPress={() => resetPassword(u)}
                            >
                              Kaydet
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() => {
                                setResetFor(null)
                                setNewPassword('')
                              }}
                            >
                              Vazgeç
                            </Button>
                          </>
                        )
                      : (
                          <>
                            <Button
                              size="sm"
                              variant="bordered"
                              isDisabled={locked || busyId === u.id}
                              onPress={() => toggleAdmin(u)}
                            >
                              {u.roles.includes('admin') ? 'Adminliği Kaldır' : 'Admin Yap'}
                            </Button>
                            <Button
                              size="sm"
                              variant="bordered"
                              isDisabled={locked || busyId === u.id}
                              onPress={() => {
                                setResetFor(u.id)
                                setNewPassword('')
                              }}
                            >
                              Şifre Sıfırla
                            </Button>
                            <Button
                              size="sm"
                              color="danger"
                              variant="bordered"
                              isDisabled={locked || busyId === u.id}
                              onPress={() => remove(u)}
                            >
                              Sil
                            </Button>
                          </>
                        )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      <p className="text-xs text-foreground-500">
        Şifreler Supabase tarafında hash&apos;li saklanır — düz metin olarak görüntülenemez;
        sıfırlama ile yeni şifre belirleyebilirsin. Hakların davranışa bağlanması (mesaj,
        dosya, blog, proje) modüller üzerinde kademeli olarak uygulanır; rolleri ve özel
        yetkileri şimdiden atayabilirsin.
      </p>
    </div>
  )
}
