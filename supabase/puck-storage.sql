-- Sayfa Düzenleyici (Puck) kalıcı depolama — Supabase/Postgres
-- Idempotent: tekrar çalıştırmak güvenli.

create table if not exists public.puck_pages (
  page       text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.puck_versions (
  id         text primary key,
  page       text not null,
  name       text not null default '',
  data       jsonb not null default '{}'::jsonb,
  ts         timestamptz not null default now()
);

create index if not exists puck_versions_page_idx on public.puck_versions (page, ts desc);

-- RLS: herkese okuma (sayfa verisi herkese açık), yazma sadece servis rolü.
alter table public.puck_pages    enable row level security;
alter table public.puck_versions enable row level security;

drop policy if exists puck_pages_read    on public.puck_pages;
drop policy if exists puck_versions_read on public.puck_versions;

create policy puck_pages_read    on public.puck_pages    for select using (true);
create policy puck_versions_read on public.puck_versions for select using (true);
