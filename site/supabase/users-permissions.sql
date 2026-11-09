-- =============================================================
-- Kullanıcı yetki/limit migration — 2026-10-17
--
-- Ne yapar:
--   1) `profiles.permission_overrides` (jsonb) — kullanıcıya özel yetki
--      GEÇERSİZ KILMA. Eski `permissions` text[] yalnız EKLEYEBİLİYORDU
--      (çıkarma yoktu); yeni alan hem açar hem kapatır.
--      Bu yüzden "Özel Yetkiler" panelinde her şey kapalı görünüyordu:
--      etkin yetki artık `rol + varsayılan + override`.
--   2) `profiles.limits.maxTotalUploadBytes` — toplam yükleme kotası.
--      Uygulanmışsa açıkça yazılır (varsayılan 1 MB); elle verilmiş
--      değer EZİLMEZ.
--   3) `audit_log` — "İncele" ve yönetim işlemlerinin denetim kaydı.
--
-- Aynı dosyayı iki kez çalıştırmak güvenlidir (idempotent).
-- Supabase Dashboard → SQL Editor'de çalıştır.
-- =============================================================

-- ---------- 1) yetki override'ları ----------
alter table public.profiles
  add column if not exists permission_overrides jsonb not null default '{}'::jsonb;

comment on column public.profiles.permission_overrides is
  'Kullanıcıya özel yetki geçersiz kılma: {"chat.send": false}. Boş = varsayılan.';

-- Eski elle verilmiş yetkileri (permissions text[]) override'a taşı.
-- Yalnız override'ı henüz boş olan satırlarda çalışır → elle yapılmış
-- ayarlar EZİLMEZ. (Eski dizi semantiği yalnız `true` verebiliyordu.)
update public.profiles p
set permission_overrides = (
  select coalesce(jsonb_object_agg(perm.id, true), '{}'::jsonb)
  from unnest(p.permissions) as perm(id)
)
where coalesce(array_length(p.permissions, 1), 0) > 0
  and (p.permission_overrides = '{}'::jsonb or p.permission_overrides is null);

-- ---------- 2) toplam yükleme kotası ----------
-- ÖNEMLİ: yalnızca alan HİÇ YOKSA yazar. `jsonb_exists` (?) operatörü
-- yerine `->` ile kontrol: anahtar yoksa NULL döner.
update public.profiles
set limits = coalesce(limits, '{}'::jsonb)
             || jsonb_build_object('maxTotalUploadBytes', 1048576)
where (limits -> 'maxTotalUploadBytes') is null
  and coalesce(is_owner, false) = false
  and not (coalesce(roles, array[]::text[]) @> array['admin']);

comment on column public.profiles.limits is
  'Kullanıcı limitleri: {"maxTotalUploadBytes":1048576,"maxMessages":null}. null = sınırsız.';

-- ---------- 3) denetim kaydı ----------
create table if not exists public.audit_log (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  actor_id    text not null,
  actor_name  text,
  -- 'inspect' | 'updateProfile' | 'setRoles' | 'setPermissions' | 'setLimits'
  -- | 'resetPassword' | 'delete'
  action      text not null,
  target_id   text not null,
  target_label text,
  meta        jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_target_idx on public.audit_log (target_id);

comment on table public.audit_log is
  '"İncele" ve yönetim işlemlerinin denetim kaydı: kim, kimi, ne zaman, ne yaptı.';

-- RLS açık + politika YOK → yalnızca service_role (API) erişir.
-- Panel bu tabloyu doğrudan okumaz; kayıtlar SQL Editor'den incelenir.
alter table public.audit_log enable row level security;
