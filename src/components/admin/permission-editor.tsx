'use client'

import type { AdminUserRow, PermissionOverrides } from '@/lib/admin/users-shared'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import {
  ALL_PERMISSION_IDS,
  DEFAULT_GRANTED_IDS,
  PERMISSION_GROUPS,
  ROLE_PRESETS,
} from '@/lib/permissions'

/**
 * "Özel Yetkiler" popover'ı.
 *
 * KÖK NEDEN (kullanıcı raporu: "hepsi kapalı görünüyor"): anahtarlar
 * `permissions[]` dizisine bakıyordu ve o dizi normal kullanıcıda BOŞTU.
 * Artık anahtarlar ETKİN değeri gösterir:
 *
 *   etkin = (normal kullanıcı varsayılanları ∪ rol preset'leri)
 *            + override(true) − override(false)
 *
 * Override YALNIZCA varsayılandan sapan yetkiler için yazılır — "varsayılana
 * dön" = anahtarı silmek. Böylece kayıt küçük kalır ve yeni varsayılanlar
 * (ileride eklenirse) kendiliğinden geçerli olur.
 */

/** Rol + varsayılan tabanı (override'sız hâl). */
export function basePermissions(roles: string[]): Set<string> {
  const set = new Set<string>(DEFAULT_GRANTED_IDS)
  for (const r of roles) {
    const preset = ROLE_PRESETS.find(x => x.id === r)
    if (!preset) {
      continue
    }
    for (const pattern of preset.permissions) {
      if (pattern === '*') {
        for (const id of ALL_PERMISSION_IDS) set.add(id)
      }
      else if (pattern.endsWith('.*')) {
        const g = PERMISSION_GROUPS.find(x => x.id === pattern.slice(0, -2))
        for (const p of g?.permissions ?? []) set.add(p.id)
      }
      else {
        set.add(pattern)
      }
    }
  }
  if (roles.includes('admin')) {
    for (const id of ALL_PERMISSION_IDS) set.add(id)
  }
  return set
}

/** Override'ları uygulanmış etkin kimlik kümesi. */
export function applyOverrides(
  base: Set<string>,
  overrides: PermissionOverrides,
  roles: string[] = [],
): Set<string> {
  const set = new Set(base)
  for (const [id, on] of Object.entries(overrides)) {
    if (on) {
      set.add(id)
    }
    else {
      set.delete(id)
    }
  }
  // Admin rolü dokunulmaz: sunucudaki `effectivePermissions` ile aynı kural
  // (override bile kapatamaz) — arayüz sunucudan farklı göstermemeli.
  if (roles.includes('admin')) {
    for (const id of ALL_PERMISSION_IDS) set.add(id)
  }
  return set
}

/**
 * `id` yetkisini `target` durumuna getiren MİNİMAL override güncellemesi.
 * Varsayılan zaten `target` ise anahtar silinir.
 */
export function toggleOverride(
  draft: PermissionOverrides,
  base: Set<string>,
  id: string,
  target: boolean,
): PermissionOverrides {
  const next = { ...draft }
  if (base.has(id) === target) {
    delete next[id]
  }
  else {
    next[id] = target
  }
  return next
}

export function PermissionEditor({
  user,
  draft,
  onChange,
  onSave,
  onReset,
  busy,
}: {
  user: AdminUserRow
  draft: PermissionOverrides
  onChange: (next: PermissionOverrides) => void
  onSave: () => void
  onReset: () => void
  busy: boolean
}) {
  const base = basePermissions(user.roles)
  const effective = applyOverrides(base, draft, user.roles)
  const overrideCount = Object.keys(draft).length

  return (
    <div className="max-h-[60vh] w-80 overflow-y-auto px-1 py-2">
      {/* Kaydet EN ÜSTTE (2026-10-19, kullanıcı isteği: "Kaydet olacak sabit
          en üstte... illa en aşağı girmek zorunda kalmayalım"). Uzun listede
          butonu bulmak için dibe inmek gerekiyordu. Alt kopya KALDIRILDI ki
          iki Kaydet karışmasın. */}
      <Button
        size="sm"
        color="primary"
        className="mb-2 w-full"
        isDisabled={busy}
        onPress={onSave}
      >
        Kaydet
      </Button>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground-500">
          Özel Yetkiler (
{effective.size}
/
{ALL_PERMISSION_IDS.length}
)
{overrideCount > 0 && (
            <span className="ml-1 font-normal text-primary">
              ·
{' '}
{overrideCount}
{' '}
özel ayar
</span>
          )}
        </p>
        <Button
          size="sm"
          variant="light"
          isDisabled={busy || overrideCount === 0}
          onPress={onReset}
        >
          Varsayılana dön
        </Button>
      </div>
      <p className="mb-2 text-[10px] leading-tight text-foreground-500">
        Anahtarlar ETKİN durumu gösterir. Varsayılandan sapmayan bir anahtar
        kaydedilmez; &quot;↺&quot; yalnız o yetkiyi varsayılana döndürür.
      </p>

      {PERMISSION_GROUPS.map((g) => {
        const ids = g.permissions.map(p => p.id)
        const onIds = ids.filter(id => effective.has(id))
        const allOn = onIds.length === ids.length
        const someOn = onIds.length > 0
        const setGroup = (target: boolean) => {
          let next = draft
          for (const id of ids) {
            next = toggleOverride(next, base, id, target)
          }
          onChange(next)
        }
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
                  if (el) {
                    el.indeterminate = someOn && !allOn
                  }
                }}
                onChange={e => setGroup(e.target.checked)}
              />
              <Icon icon={g.icon} width={14} className="text-primary" />
              {g.label}
              {onIds.length > 0 && (
                <span className="font-normal text-foreground-500">
                  (
{onIds.length}
/
{ids.length}
)
</span>
              )}
            </label>
            <div className="mt-1.5 flex flex-col gap-0.5 pl-6">
              {g.permissions.map((p) => {
                const overridden = draft[p.id] !== undefined
                const on = effective.has(p.id)
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 text-xs text-foreground-500 hover:text-foreground"
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="accent-[var(--primary)]"
                        checked={on}
                        onChange={e =>
                          onChange(
                            toggleOverride(draft, base, p.id, e.target.checked),
                          )}
                      />
                      <span className={overridden ? 'text-primary' : ''}>
                        {p.label}
                      </span>
                    </label>
                    {overridden && (
                      <button
                        type="button"
                        aria-label={`${p.label} yetkisini varsayılana döndür`}
                        title="Varsayılana dön"
                        className="rounded p-0.5 text-primary hover:bg-primary/10"
                        onClick={() => {
                          const next = { ...draft }
                          delete next[p.id]
                          onChange(next)
                        }}
                      >
                        <Icon icon="material-symbols:restart-alt" width={13} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
