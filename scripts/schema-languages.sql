-- Tarnak site languages table
-- Idempotent: safe to run multiple times.
--
-- Usage: Supabase Dashboard -> SQL Editor -> paste -> Run

create table if not exists public.languages (
  id          uuid primary key default gen_random_uuid(),
  language    text not null,
  level       text not null default 'A1',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Enable RLS
alter table public.languages enable row level security;

-- Public can read
drop policy if exists "languages_read_public" on public.languages;
create policy "languages_read_public"
  on public.languages
  for select
  using ( true );

-- Only authenticated admins can write
drop policy if exists "languages_write_admin" on public.languages;
create policy "languages_write_admin"
  on public.languages
  for all
  using (
    auth.role() = 'authenticated'
  )
  with check (
    auth.role() = 'authenticated'
  );

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_languages_updated_at on public.languages;
create trigger trg_languages_updated_at
  before update on public.languages
  for each row
  execute function public.set_updated_at();
