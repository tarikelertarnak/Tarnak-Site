'use client'

import type {
  AdminUserRow,
  PermissionOverrides,
} from '@/lib/admin/users-shared'
import { Icon } from '@iconify/react'
import { Popover } from '@lobehub/ui/base-ui'
import { useCallback, useEffect, useState } from 'react'
import { LimitsEditor } from '@/components/admin/limits-editor'
import { PermissionEditor } from '@/components/admin/permission-editor'
import { UserEditForm } from '@/components/admin/user-edit-form'
import {
  formatDateTime,
  UserInspectPanel,
} from '@/components/admin/user-inspect-panel'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ROLE_PRESETS } from '@/lib/permissions'

/**
 * "Hesap Sahipleri / Kullanıcı Yönetimi".
 *
 * İki satırlı kart:
 *   Satır 1 — avatar, kullanıcı adı (kalın), rol rozetleri, e-posta (soluk),
 *             "Kayıt: … · Son giriş: …"
 *   Satır 2 — komut butonları (ikon + etiket, mobilde kaydırılır)
 *
 * Yetki modeli (2026-10-17):
 *   · Normal kullanıcının yetkileri varsayılan AÇIK (mesaj, dosya, proje
 *     görüntüleme); tehlikeli olanlar kapalı. "Özel Yetkiler" anahtarları
 *     artık ETKİN değeri gösterir, kayıt yalnızca sapanları tutar.
 *   · Limitler: 1 MB toplam yükleme, sınırsız mesaj.
 *   · "admin" rolünü açıp kapatan ayrı buton YOK (2026-10-19, kullanıcı
 *     isteği: "roller var zaten, o butonu kaldır") — admin rolü yalnız
 *     Roller popover'ındaki `admin` preset'inden verilir/alınır.
 *   · Site Sahibi satırında Roller/Yetkiler/Limitler/Sil RENDER
 *     EDİLMEZ; yalnız Şifre Sıfırla + Düzenle, yalnız site sahibinin
 *     kendisine görünür. Sunucu da aynı kuralları zorlar.
 *   · Yalnız Site Sahibi "İncele" görür (sunucuda `role === owner`).
 */

type Banner = { type: 'success' | 'error', text: string } | null

const roleBadge: Record<string, { label: string, cls: string }> = {
  'admin': { label: 'Admin', cls: 'bg-primary/20 text-primary' },
  'admin-assistant': {
    label: 'Admin Asistanı',
    cls: 'bg-violet-500/20 text-violet-300',
  },
  'trustworthy': {
    label: 'Güvenilir',
    cls: 'bg-emerald-500/20 text-emerald-300',
  },
  'employer': { label: 'İşveren', cls: 'bg-amber-500/20 text-amber-300' },
  'verified': { label: 'Doğrulanmış', cls: 'bg-sky-500/20 text-sky-300' },
  'user': { label: 'User', cls: 'bg-white/10 text-foreground-500' },
}

/**
 * Görüntüleyen "site sahibi" mi?
 * `admin:` önekli oturum = `/login` ana anahtarı (admin.json). Bu hesabın
 * `profiles` satırı yok; sahip eşdeğeri sayılır (bkz. API route açıklaması).
 */
function isOwnerViewer(viewer: { id: string, isOwner: boolean } | null): boolean {
  return !!viewer && (viewer.isOwner || viewer.id.startsWith('admin:'))
}

export function UsersPanel() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null)
  const [viewer, setViewer] = useState<{ id: string, isOwner: boolean } | null>(null)
  const [banner, setBanner] = useState<Banner>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Edit popovers
  const [rolesFor, setRolesFor] = useState<AdminUserRow | null>(null)
  const [permsFor, setPermsFor] = useState<AdminUserRow | null>(null)
  const [limitsFor, setLimitsFor] = useState<AdminUserRow | null>(null)
  const [draftRoles, setDraftRoles] = useState<string[]>([])
  const [draftOverrides, setDraftOverrides] = useState<PermissionOverrides>({})
  const [resetFor, setResetFor] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  // Drawers
  const [editFor, setEditFor] = useState<string | null>(null)
  const [inspectFor, setInspectFor] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && data.success) {
        setUsers(data.users)
      }
      else {
        setBanner({
          type: 'error',
          text: data.message || 'Kullanıcılar yüklenemedi.',
        })
      }
    }
    catch {
      setBanner({
        type: 'error',
        text: 'Kullanıcılar yüklenemedi (ağ hatası).',
      })
    }
  }, [])

  useEffect(() => {
    load()
    fetch('/api/admin/session', { cache: 'no-store' })
      .then(r => r.json())
      .then((data) => {
        if (data?.user) {
          setViewer({ id: data.user.id, isOwner: !!data.user.isOwner })
        }
      })
      .catch(() => {})
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

  const openRoles = (u: AdminUserRow) => {
    setDraftRoles([...u.roles])
    setRolesFor(u)
  }
  const saveRoles = () => {
    if (!rolesFor) {
      return
    }
    mutate(rolesFor.id, {
      action: 'setRoles',
      userId: rolesFor.id,
      roles: draftRoles,
    })
    setRolesFor(null)
  }

  const openPerms = (u: AdminUserRow) => {
    setDraftOverrides({ ...u.permissionOverrides })
    setPermsFor(u)
  }
  const savePerms = () => {
    if (!permsFor) {
      return
    }
    mutate(permsFor.id, {
      action: 'setPermissions',
      userId: permsFor.id,
      overrides: draftOverrides,
    })
    setPermsFor(null)
  }

  const saveLimits = (
    userId: string,
    limits: { maxTotalUploadBytes: number | null, maxMessages: number | null },
  ) => {
    mutate(userId, { action: 'setLimits', userId, limits })
    setLimitsFor(null)
  }

  const resetPassword = (u: AdminUserRow) => {
    if (!newPassword.trim() || newPassword.length < 6) {
      setBanner({ type: 'error', text: 'Yeni şifre en az 6 karakter olmalı.' })
      return
    }
    mutate(u.id, {
      action: 'resetPassword',
      userId: u.id,
      password: newPassword,
    })
    setResetFor(null)
    setNewPassword('')
  }

  const remove = (u: AdminUserRow) => {
    if (
      !window.confirm(
        `"${u.username || u.email || u.id}" hesabını sil? Bu geri alınamaz.`,
      )
    ) {
      return
    }
    act(u.id, { method: 'DELETE' })
  }

  const ownerViewer = isOwnerViewer(viewer)
  /** Şifresi sıfırlanacak kullanıcı (popup başlığı için). */
  const resetUser = users?.find(x => x.id === resetFor) ?? null

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
              const isSelf = viewer?.id === u.id
              /*
                SİTE SAHİBİ SATIRI: Roller / Özel Yetkiler / Limitler / Sil
                RENDER EDİLMEZ. Yalnız Şifre Sıfırla +
                Düzenle ve yalnız site sahibi kendi satırına bakarken.
                Sunucu da aynı kuralları zorlar (403).
              */
              const showRow2 = u.isOwner ? ownerViewer : true
              return (
                <li key={u.id} className="flex flex-col gap-2 px-4 py-3">
                  {/* ── Satır 1: kimlik ─────────────────────────── */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {u.avatarUrl ? (
                      // Avatar URL'leri kullanıcı tarafından (OAuth) gelir —
                      // next/image optimizasyonu gerekmiyor, `<img>` bilinçli.
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
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
                        <span className="truncate">{u.username || '—'}</span>
                        {u.isOwner && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                            🔒 Site Sahibi
                          </span>
                        )}
                        {u.roles.map((r) => {
                          const b = roleBadge[r]
                          if (!b) {
                            return null
                          }
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
                        {u.email || 'e-posta yok'}
                        {u.fullName ? ` · ${u.fullName}` : ''}
                        {u.phone ? ` · ☎ ${u.phone}` : ''}
                      </p>
                      <p className="truncate text-[11px] text-foreground-500/70">
                        Kayıt:
{' '}
{formatDateTime(u.createdAt)}
                        {' · '}
Son giriş:
{formatDateTime(u.lastSignIn)}
                      </p>
                    </div>
                  </div>

                  {/* ── Satır 2: komutlar ───────────────────────── */}
                  {showRow2 && (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-foreground-200/10 pt-2 sm:flex-nowrap sm:overflow-x-auto">
                      {u.isOwner ? (
                        <>
                          <Button
                            size="sm"
                            variant="bordered"
                            isDisabled={busyId === u.id}
                            onPress={() => setEditFor(u.id)}
                          >
                            <Icon icon="material-symbols:edit-outline" width={14} />
                            Düzenle
                          </Button>
                          <Button
                            size="sm"
                            variant="bordered"
                            isDisabled={busyId === u.id}
                            onPress={() => {
                              setResetFor(u.id)
                              setNewPassword('')
                            }}
                          >
                            <Icon icon="material-symbols:lock-reset" width={14} />
                            Şifre Sıfırla
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="bordered"
                            isDisabled={busyId === u.id}
                            onPress={() => setEditFor(u.id)}
                          >
                            <Icon icon="material-symbols:edit-outline" width={14} />
                            Düzenle
                          </Button>

                          {ownerViewer && (
                            <Button
                              size="sm"
                              variant="bordered"
                              isDisabled={busyId === u.id}
                              onPress={() => setInspectFor(u.id)}
                            >
                              <Icon icon="material-symbols:search" width={14} />
                              İncele
                            </Button>
                          )}

                          <Popover
                            placement="bottomRight"
                            open={rolesFor?.id === u.id}
                            onOpenChange={(open: boolean) =>
                              !open && setRolesFor(null)}
                            trigger="click"
                            content={(
                              <div className="w-64 px-1 py-2">
                                {/* Kaydet + İptal (2026-10-20, kullanıcı isteği:
                                    "rollere ... Kaydet yanında İptal olacak"). */}
                                <div className="mb-2 flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    color="primary"
                                    className="flex-1"
                                    isDisabled={busyId === u.id}
                                    onPress={saveRoles}
                                  >
                                    Kaydet
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="light"
                                    onPress={() => setDraftRoles([...u.roles])}
                                  >
                                    İptal Et
                                  </Button>
                                </div>
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
                                          setDraftRoles(prev =>
                                            e.target.checked
                                              ? prev.includes(id)
                                                ? prev
                                                : [...prev, id]
                                              : prev.filter(x => x !== id),
                                          )
                                        }}
                                      />
                                      <span className="flex flex-col">
                                        <span className="font-semibold">
                                          {r.label}
                                        </span>
                                        <span className="text-[10px] text-foreground-500">
                                          {r.description}
                                        </span>
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          >
                            <Button
                              size="sm"
                              variant="bordered"
                              isDisabled={busyId === u.id}
                              onPress={() => openRoles(u)}
                            >
                              <Icon icon="material-symbols:badge-outline" width={14} />
                              Roller
                            </Button>
                          </Popover>

                          <Popover
                            placement="bottomRight"
                            open={permsFor?.id === u.id}
                            onOpenChange={(open: boolean) =>
                              !open && setPermsFor(null)}
                            trigger="click"
                            content={(
                              <PermissionEditor
                                user={u}
                                draft={draftOverrides}
                                onChange={setDraftOverrides}
                                onSave={savePerms}
                                onReset={() => setDraftOverrides({})}
                                busy={busyId === u.id}
                              />
                            )}
                          >
                            <Button
                              size="sm"
                              variant="bordered"
                              isDisabled={busyId === u.id}
                              onPress={() => openPerms(u)}
                            >
                              <Icon icon="material-symbols:key-outline" width={14} />
                              Özel Yetkiler
                              {u.overrideCount > 0 && (
                                <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-[10px] font-bold text-primary">
                                  {u.overrideCount}
                                </span>
                              )}
                            </Button>
                          </Popover>

                          <Popover
                            placement="bottomRight"
                            open={limitsFor?.id === u.id}
                            onOpenChange={(open: boolean) =>
                              !open && setLimitsFor(null)}
                            trigger="click"
                            content={(
                              <LimitsEditor
                                user={u}
                                busy={busyId === u.id}
                                onSave={limits => saveLimits(u.id, limits)}
                              />
                            )}
                          >
                            <Button
                              size="sm"
                              variant="bordered"
                              isDisabled={busyId === u.id}
                              onPress={() => setLimitsFor(u)}
                            >
                              <Icon icon="material-symbols:speed-outline" width={14} />
                              Limitler
                            </Button>
                          </Popover>
                        </>
                      )}

                      {!u.isOwner && (
                        <>
                          <Button
                            size="sm"
                            variant="bordered"
                            isDisabled={busyId === u.id}
                            onPress={() => {
                              setResetFor(u.id)
                              setNewPassword('')
                            }}
                          >
                            <Icon icon="material-symbols:lock-reset" width={14} />
                            Şifre Sıfırla
                          </Button>
                          {!isSelf && (
                            <Button
                              size="sm"
                              color="danger"
                              variant="bordered"
                              isDisabled={busyId === u.id}
                              onPress={() => remove(u)}
                            >
                              <Icon icon="material-symbols:delete-outline" width={14} />
                              Sil
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      <p className="text-xs text-foreground-500">
        Şifreler Supabase tarafında hash&apos;li saklanır — düz metin olarak
        görüntülenemez. Yetki ve limitler sunucuda zorlanır (arayüzde gizlemek
        güvenlik sayılmaz). &quot;İncele&quot; yalnız site sahibine görünür ve
        her açılış denetim kaydına yazılır.
      </p>

      <UserEditForm
        userId={editFor}
        onClose={() => setEditFor(null)}
        onSaved={load}
      />
      <UserInspectPanel
        userId={inspectFor}
        onClose={() => setInspectFor(null)}
        onResetPassword={(id) => {
          setInspectFor(null)
          setResetFor(id)
          setNewPassword('')
        }}
      />

      {/* Şifre Sıfırla artık POPUP (2026-10-20, kullanıcı isteği: "Şifre
          Sıfırla basıldığında Popup olarak açılsın şu anki gibi değil").
          Eskiden satır içi input açılıyordu. */}
      <Modal
        open={resetFor !== null}
        onClose={() => {
          setResetFor(null)
          setNewPassword('')
        }}
        title="Şifre Sıfırla"
      >
        <div className="flex flex-col gap-3">
          {/* Şifre sıfırlanacak kullanıcının adı — `users` ilk yüklemede null
              olabilir; o durumda genel metin. */}
          <p className="text-sm text-foreground-500">
            {resetUser
              ? `"${resetUser.username || resetUser.email || resetUser.id}" için yeni şifre belirle.`
              : 'Yeni şifre belirle.'}
          </p>
          <Input
            variant="faded"
            type="password"
            placeholder="Yeni şifre (min 6)"
            value={newPassword}
            onValueChange={setNewPassword}
          />
          <div className="flex items-center gap-2">
            <Button
              color="primary"
              className="font-semibold"
              isDisabled={busyId !== null}
              onPress={() => {
                if (resetUser)
                  resetPassword(resetUser)
              }}
            >
              Şifreyi Sıfırla
            </Button>
            <Button
              variant="light"
              onPress={() => {
                setResetFor(null)
                setNewPassword('')
              }}
            >
              İptal Et
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
