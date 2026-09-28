-- CV belgeleri (çok dilli / çok dosyalı) — admin panelinden yönetilir.
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

-- İlk kayıt: mevcut tek CV dosyası
insert into public.cvs (label, lang, href, sort_order)
values ('Türkçe CV', 'tr', '/cv/tarikeler-cv.pdf', 0)
on conflict do nothing;
