// ─────────────────────────────────────────────────────────────
// Tarnak role/permission catalog
//
// Roles are "preset groups" — each role brings a set of permissions.
// A user can have multiple roles (profiles.roles[]); individual
// non-preset permissions are also added via profiles.permissions[].
// Effective permissions = union of role permissions ∪ permissions[].
// ─────────────────────────────────────────────────────────────

export interface PermDef {
  id: string
  label: string
}

export interface PermGroup {
  id: string
  label: string
  icon: string
  permissions: PermDef[]
}

/** Permission groups — for the "grouped" view in the panel. */
export const PERMISSION_GROUPS: PermGroup[] = [
  {
    id: 'chat',
    label: 'Mesajlar',
    icon: 'mdi:chat-outline',
    permissions: [
      { id: 'chat.send', label: 'Mesaj atabilme' },
      { id: 'chat.read', label: 'Mesajları görebilme' },
      { id: 'chat.delete', label: 'Mesaj silebilme' },
    ],
  },
  {
    id: 'files',
    label: 'Dosyalar',
    icon: 'mdi:file-outline',
    permissions: [
      { id: 'files.upload', label: 'Dosya yükleyebilme' },
      { id: 'files.view', label: 'Dosyaları görebilme' },
      { id: 'files.delete', label: 'Dosya silebilme' },
    ],
  },
  {
    id: 'location',
    label: 'Konum',
    icon: 'mdi:map-marker-outline',
    permissions: [{ id: 'location.view', label: 'Konumumu görebilme' }],
  },
  {
    id: 'blog',
    label: 'Blog Yönetimi',
    icon: 'mdi:post-outline',
    permissions: [
      { id: 'blog.view', label: 'Yazıları görebilme' },
      { id: 'blog.create', label: 'Yazı ekleyebilme' },
      { id: 'blog.edit', label: 'Yazı düzenleyebilme' },
      { id: 'blog.delete', label: 'Yazı silebilme' },
    ],
  },
  {
    id: 'projects',
    label: 'Proje Yönetimi',
    icon: 'mdi:folder-outline',
    permissions: [
      { id: 'projects.view', label: 'Projeleri görebilme' },
      { id: 'projects.create', label: 'Proje ekleyebilme' },
      { id: 'projects.edit', label: 'Proje düzenleyebilme' },
      { id: 'projects.delete', label: 'Proje silebilme' },
    ],
  },
  {
    id: 'users',
    label: 'Kullanıcı Yönetimi',
    icon: 'mdi:account-group-outline',
    permissions: [
      { id: 'users.view', label: 'Kullanıcıları görebilme' },
      { id: 'users.manage', label: 'Rol ve yetki değiştirebilme' },
      { id: 'users.delete', label: 'Kullanıcı silebilme' },
    ],
  },
  {
    id: 'panel',
    label: 'Yönetim Paneli',
    icon: 'mdi:shield-cog-outline',
    permissions: [
      { id: 'panel.admin', label: 'Admin paneline erişim' },
      { id: 'panel.settings', label: 'Site ayarlarını yönetme' },
    ],
  },
]

export interface RolePreset {
  id: string
  label: string
  description: string
  /** Permission patterns; 'X.*' means group-wide, '*' means all. */
  permissions: string[]
}

/** Preset roles — per user's definitions. */
export const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'admin',
    label: 'Admin',
    description: 'Her şey — admin panelini yönetir.',
    permissions: ['*'],
  },
  {
    id: 'admin-assistant',
    label: 'Admin Asistanı',
    description: 'Projeleri ve blogları yönetir.',
    permissions: ['projects.*', 'blog.*', 'chat.read', 'files.view', 'users.view'],
  },
  {
    id: 'trustworthy',
    label: 'Trustworthy (Güvenilir)',
    description: 'Mesaj atar, dosya yükler, konumu görür.',
    permissions: ['chat.send', 'files.upload', 'location.view'],
  },
  {
    id: 'employer',
    label: 'Employer (İşveren)',
    description: 'Her şeyimi bilir — konum dahil; dosya yükleyebilir.',
    permissions: [
      'location.view',
      'files.upload',
      'files.view',
      'chat.send',
      'projects.view',
    ],
  },
  {
    id: 'verified',
    label: 'Verified (Doğrulanmış)',
    description: 'Dosya yükleyebilir.',
    permissions: ['files.upload'],
  },
  {
    id: 'user',
    label: 'User',
    description: 'Temel üye — site sahibiyle sohbet eder.',
    /*
      Kullanıcı isteği (2026-10-12): "normal kullanıcılar ise sadece benimle
      ya da onu eklediğim gruplarda ya da benim ona izin verdiğim kişilerle
      konuşabilir". Yani sahiple sohbet VARSAYILAN haktır; kiminle
      konuşulabileceğini API kısıtlar (`/api/chat/users` + `action:'open'`:
      yalnız site sahibi). Boş izin listesi yüzünden kayıtlı her normal
      kullanıcı 403 "Sohbet iznin yok." alıyordu.
    */
    permissions: ['chat.send', 'chat.read'],
  },
]

export const ALL_PERMISSION_IDS: string[] = PERMISSION_GROUPS.flatMap(g =>
  g.permissions.map(p => p.id),
)

const VALIDS = new Set(ALL_PERMISSION_IDS)
const ROLES = new Set(ROLE_PRESETS.map(r => r.id))

/**
 * Rollerin görünen adı — `ROLE_PRESETS` etiketleri tek dilli (TR).
 * Panel/UI birden çok dilde çalıştığı için gösterim adı ayrı tutulur;
 * kaynak yine `ROLE_PRESETS` (yeni rol eklenince buraya da girmeli).
 */
export const ROLE_LABELS: Record<string, { tr: string, en: string }> = {
  'admin': { tr: 'Yönetici', en: 'Administrator' },
  'admin-assistant': { tr: 'Admin Asistanı', en: 'Admin Assistant' },
  'trustworthy': { tr: 'Güvenilir', en: 'Trustworthy' },
  'employer': { tr: 'İşveren', en: 'Employer' },
  'verified': { tr: 'Doğrulanmış', en: 'Verified' },
  'user': { tr: 'Kullanıcı', en: 'User' },
}

/**
 * `profiles.is_owner === true` olan hesap — site sahibi, en üst yetki.
 * 2026-10-13 (kullanıcı isteği): "Süper Yönetici" → "Site Sahibi".
 */
const OWNER_LABEL = { tr: 'Site Sahibi', en: 'Site Owner' }

/**
 * Rolün, mevcut locale'e göre çevrilmiş görünen adı.
 * Tanınmayan rol için ham id döner (yeni rol eklenince etiket boş kalmaz).
 */
export function roleLabel(
  role?: string | null,
  locale?: string,
  isOwner = false,
): string {
  if (isOwner) {
    return locale?.startsWith('tr') ? OWNER_LABEL.tr : OWNER_LABEL.en
  }
  const entry = ROLE_LABELS[role ?? '']
  if (!entry) {
    return role || '—'
  }
  return locale?.startsWith('tr') ? entry.tr : entry.en
}

export function isValidPermission(id: string): boolean {
  return VALIDS.has(id)
}

export function isValidRole(id: string): boolean {
  return ROLES.has(id)
}

/** Expands a pattern like 'blog.*' into individual permissions. */
export function expandPermissionPattern(pattern: string): string[] {
  if (pattern === '*')
    return [...ALL_PERMISSION_IDS]
  if (pattern.endsWith('.*')) {
    const group = pattern.slice(0, -2)
    const g = PERMISSION_GROUPS.find(x => x.id === group)
    return g ? g.permissions.map(p => p.id) : []
  }
  return isValidPermission(pattern) ? [pattern] : []
}

/** Effective permission set from roles + individual permissions (admin always has all). */
export function effectivePermissions(
  roles: string[],
  extra: string[] = [],
): string[] {
  const set = new Set<string>()
  for (const r of roles) {
    const preset = ROLE_PRESETS.find(x => x.id === r)
    if (!preset)
      continue
    for (const pattern of preset.permissions) {
      for (const id of expandPermissionPattern(pattern)) set.add(id)
    }
  }
  for (const id of extra) {
    if (isValidPermission(id))
      set.add(id)
  }
  // Admin protection: anyone with the admin role always has full permissions.
  if (roles.includes('admin')) {
    for (const id of ALL_PERMISSION_IDS) set.add(id)
  }
  return [...set]
}

export function hasPermission(
  perms: string[],
  id: string,
): boolean {
  return perms.includes(id)
}
