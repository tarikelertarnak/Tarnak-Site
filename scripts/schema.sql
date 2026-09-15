-- =============================================================
-- Portfolio site schema — Supabase (2026-08-10)
-- =============================================================

-- 1. KULLANICILAR (Supabase auth.users ile 1:1)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  bio text,
  github_handle text,
  website text,
  is_owner boolean not null default false,
  roles text[] not null default array['user'],
  permissions text[] not null default array[]::text[],
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Yeni kullanıcı kaydolunca otomatik profil oluştur
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    case when new.email = 'tarikelertarnak@gmail.com' then 'admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Site sahibi dokunulmaz: statü, roller, yetkiler ve limitler asla değiştirilemez.
-- Ayrıca role kolonu, roles[] kümesiyle senkron tutulur.
create or replace function public.protect_owner()
returns trigger
language plpgsql
as $$
begin
  if OLD.is_owner then
    NEW.is_owner := true;
    NEW.roles := OLD.roles;
    NEW.role := OLD.role;
    NEW.permissions := OLD.permissions;
    NEW.limits := OLD.limits;
  end if;
  if NEW.roles @> array['admin'::text] then
    NEW.role := 'admin';
  else
    NEW.role := 'user';
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_owner on public.profiles;
create trigger protect_owner
  before update on public.profiles
  for each row execute procedure public.protect_owner();

-- 2. MESAJLAR (iletişim formu)
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  subject text,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3. BLOG YAZILARI
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  slug text unique not null,
  title text not null,
  excerpt text,
  content text not null,
  tags text[] default '{}',
  cover text,
  published boolean not null default false,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. PROJELER
create table if not exists public.projects (
  id bigint generated always as identity primary key,
  slug text unique not null,
  title text not null,
  description text,
  tech text[] default '{}',
  repo_url text,
  demo_url text,
  image text,
  featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. YETENEKLER / MARQUEE (bilgi seviyesi + ilgili projeler)
create table if not exists public.skills (
  id bigint generated always as identity primary key,
  label text unique not null,          -- "TypeScript"
  icon text not null,                  -- iconify ikonu
  level int not null default 70,       -- 0-100 bilgi seviyesi
  years int not null default 1,        -- deneyim yılı
  description text,                    -- kısa açıklama
  project_ids bigint[] default '{}',   -- ilgili projeler
  sort_order int not null default 0
);

-- 6. İSTATİSTİKLER (10+ Projects, 15+ Technologies, 100% Focus)
create table if not exists public.stats (
  id int primary key default 1 check (id = 1),
  projects int not null default 10,
  technologies int not null default 15,
  focus int not null default 100,
  experience_years int not null default 3
);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;
alter table public.projects enable row level security;
alter table public.skills enable row level security;
alter table public.stats enable row level security;

-- Idempotent: mevcut policy'leri temizle (script yeniden çalıştırılabilir)
drop policy if exists "public profiles are viewable" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "anyone can insert messages" on public.messages;
drop policy if exists "admin can read messages" on public.messages;
drop policy if exists "admin can update messages" on public.messages;
drop policy if exists "published posts are public" on public.posts;
drop policy if exists "admin can manage posts" on public.posts;
drop policy if exists "projects are public" on public.projects;
drop policy if exists "admin can manage projects" on public.projects;
drop policy if exists "skills are public" on public.skills;
drop policy if exists "admin can manage skills" on public.skills;
drop policy if exists "stats are public" on public.stats;
drop policy if exists "admin can manage stats" on public.stats;
drop policy if exists "users can update own profile (backup)" on public.profiles;

-- profiles: herkes kendi profilini okuyabilir, kendisi güncelleyebilir
-- GÜVENLİK: role kolonu güncellenemez — kullanıcı kendini admin yapamaz
create policy "public profiles are viewable" on public.profiles
  for select using (true);
create policy "users can update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- messages: herkes mesaj atabilir (insert), sadece admin okuyabilir
create policy "anyone can insert messages" on public.messages
  for insert with check (
    length(name) between 1 and 30
    and length(body) <= 500
  );
create policy "admin can read messages" on public.messages
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy "admin can update messages" on public.messages
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- posts: yayınlananlar herkese, admin tümünü yönetir
create policy "published posts are public" on public.posts
  for select using (published = true);
create policy "admin can manage posts" on public.posts
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- projects: herkese açık okuma, admin yönetir
create policy "projects are public" on public.projects
  for select using (true);
create policy "admin can manage projects" on public.projects
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- skills: herkese açık okuma, admin yönetir
create policy "skills are public" on public.skills
  for select using (true);
create policy "admin can manage skills" on public.skills
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- stats: herkese açık okuma, admin yönetir
create policy "stats are public" on public.stats
  for select using (true);
create policy "admin can manage stats" on public.stats
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================================
-- BAŞLANGIÇ VERİLERİ
-- =============================================================
insert into public.stats (id, projects, technologies, focus) values (1, 10, 15, 100)
  on conflict (id) do nothing;

-- skills: content.json toolbox'tan
insert into public.skills (label, icon, level, years, description, project_ids, sort_order) values
  ('Next.js', 'logos:nextjs-icon', 85, 3, 'React tabanlı meta-çerçeve. SSR, SSG, ISR, App Router, API route''ları ile uçtan uca full-stack uygulamalar.', '{}', 1),
  ('Tailwind', 'logos:tailwindcss-icon', 90, 3, 'Utility-first CSS. Responsive tasarım, dark mode, özel tema token''ları ile hızlı UI geliştirme.', '{}', 2),
  ('TypeScript', 'logos:typescript-icon', 80, 3, 'Tip güvenli JavaScript. Strict mode, generic''ler, tip çıkarımı ile ölçeklenebilir kod tabanları.', '{}', 3),
  ('Docker', 'logos:docker-icon', 65, 2, 'Containerization. multi-stage build, compose ile dev/prod ortamları, CI/CD entegrasyonu.', '{}', 4),
  ('PostgreSQL', 'logos:postgresql-icon', 70, 2, 'İlişkisel veritabanı. Normalizasyon, index optimizasyonu, SQL sorguları, Supabase üzerinde RLS.', '{}', 5),
  ('React', 'logos:react', 90, 4, 'Bileşen tabanlı UI. Hooks, context, performans optimizasyonu, ekosistem araçları.', '{}', 6),
  ('Node.js', 'logos:nodejs-icon', 75, 3, 'Sunucu tarafı JavaScript. REST API''ler, middleware, veritabanı bağlantıları, event-driven mimari.', '{}', 7),
  ('Git', 'logos:git-icon', 85, 4, 'Sürüm kontrolü. branching, rebase, cherry-pick, git flow, GitHub Actions ile CI.', '{}', 8),
  ('Rust', 'logos:rust', 55, 1, 'Sistem programlama. Memory safety, ownership, tokio ile async, performans kritik araçlar.', '{}', 9),
  ('Python', 'logos:python', 60, 2, 'Otomasyon ve scripting. API entegrasyonları, veri işleme, pytest ile test.', '{}', 10)
  on conflict (label) do nothing;

-- projeler (Player örnek)
insert into public.projects (slug, title, description, tech, repo_url, featured, sort_order) values
  ('player', 'Player', 'Müzik çalar uygulaması — sıra tabanlı oynatma listesi, arama, ses kontrolü.', '{Next.js,TypeScript,Tailwind}', 'https://github.com/TARIKELER-TARNAK/Player', true, 1)
  on conflict (slug) do nothing;

-- blog örneği
insert into public.posts (slug, title, excerpt, content, tags, published) values
  ('merhaba-dunya', 'Merhaba Dünya', 'Portfolio sitesinin ilk blog yazısı.', '# Merhaba Dünya\n\nBu site Supabase + Next.js ile kuruldu.', '{intro,nextjs}', true)
  on conflict (slug) do nothing;
