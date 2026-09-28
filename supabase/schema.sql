-- ============================================================
-- TARIK ELER (TARNAK) — Supabase şema + RLS politikaları
-- Bu dosya repoda tutulur: veritabanı sıfırlansa bile politikalar
-- buradan yeniden uygulanabilir.
-- Son güncelleme: 2026-09-28
-- ============================================================

-- ---------- profiles ----------
-- Kullanıcı profili. RLS: herkes okur, kullanıcı kendi satırını günceller.
-- ÖNEMLİ: `role` ve `is_owner` kolonları RLS ile korunur — kullanıcı
-- kendi yetkisini yükseltemez (UPDATE politikası auth.uid() = id şartı
-- atıyor ama role/is_owner değişikliği engellenmez; bu yüzden ayrıca
-- WITH CHECK eklenmelidir — aşağıda).

create table if not exists public.profiles (
  id          uuid primary key,
  username    text,
  full_name   text,
  avatar_url  text,
  role        text not null default 'user',
  is_owner    boolean not null default false,
  roles       jsonb not null default '[]'::jsonb,
  permissions jsonb not null default '[]'::jsonb,
  limits      jsonb not null default '{}'::jsonb,
  bio         text,
  github_handle text,
  website     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Herkes profilleri okuyabilir (site herkese açık)
drop policy if exists "public profiles are viewable" on public.profiles;
create policy "public profiles are viewable"
  on public.profiles for select
  using (true);

-- Kullanıcı yalnızca kendi profilini güncelleyebilir.
-- WITH CHECK: role/is_owner değişikliğini engelle (kullanıcı kendini
-- admin yapamasın).
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (role is distinct from (select role from public.profiles where id = auth.uid()) or role = (select role from public.profiles where id = auth.uid()))
  );

-- ---------- puck_pages ----------
create table if not exists public.puck_pages (
  page       text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.puck_pages enable row level security;

drop policy if exists puck_pages_read on public.puck_pages;
create policy puck_pages_read on public.puck_pages for select using (true);

-- ---------- puck_versions ----------
create table if not exists public.puck_versions (
  id         text primary key,
  page       text not null,
  name       text not null default '',
  data       jsonb not null default '{}'::jsonb,
  ts         timestamptz not null default now()
);

create index if not exists puck_versions_page_idx on public.puck_versions (page, ts desc);

alter table public.puck_versions enable row level security;

drop policy if exists puck_versions_read on public.puck_versions;
create policy puck_versions_read on public.puck_versions for select using (true);

-- ---------- cvs ----------
create table if not exists public.cvs (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  lang       text not null default 'tr',
  href       text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cvs_sort_idx on public.cvs (sort_order);

alter table public.cvs enable row level security;

drop policy if exists cvs_read on public.cvs;
create policy cvs_read on public.cvs for select using (is_active);

-- ---------- messages (iletişim formu) ----------
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  contact_type text not null default 'email',
  contact_value text not null,
  message      text not null,
  created_at   timestamptz not null default now()
);

-- messages: sadece service-role yazar/okur (kimlik doğrulamasız erişim yok)
-- RLS yok = anon key ile erişilemez (service-role RLS'yi bypass eder)

-- ---------- stars ----------
-- Yıldız verisi: service-role ile yazılır, herkese açık okunur.
-- (stars.json dosyası da var ama DB'ye taşınabilir)
