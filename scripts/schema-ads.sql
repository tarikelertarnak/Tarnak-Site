-- =============================================================
-- REKLAM SISTEMI SEMASI — Supabase (2026-09-22)
-- =============================================================
-- Nasil uygulanir (tek yol, 30 saniye):
--   Supabase Dashboard -> SQL Editor -> New query -> bu dosyanin TAMAMINI
--   yapistir -> Run.
--
-- Neden bu dosya elle uygulaniyor: `SUPABASE_DB_PW` .env.local'de yorumda
-- oldugu icin dogrudan psql baglantisi kurulamiyor. Tablolar olusmadan da
-- site CALISIR (src/lib/ads.ts yerlesik varsayilan reklamlara duser) —
-- sadece sayaç kalici ve ortak olmaz.
-- =============================================================

-- -------------------------------------------------------------
-- 1. REKLAM BIRIMLERI
-- -------------------------------------------------------------
create table if not exists public.ad_slots (
  id               bigint generated always as identity primary key,
  slug             text unique not null,
  title            text not null,
  description      text,
  -- image   : image_url + target_url ile gorsel banner
  -- link    : sadece metin baglanti (sponsor linki)
  -- html    : elle HTML (ozel sponsor kodu)
  -- adsense : Google AdSense <ins class="adsbygoogle"> birimi
  kind             text not null default 'image'
                     check (kind in ('image', 'html', 'link', 'adsense')),
  image_url        text,
  target_url       text,
  html             text,
  sponsor          text not null default 'TARNAK',
  -- Izlenmesi gereken zorunlu sure. Sunucu tarafi dogrulamada kullanilir.
  duration_seconds int not null default 15
                     check (duration_seconds between 5 and 120),
  placement        text not null default 'ads-page'
                     check (placement in ('ads-page', 'donate', 'banner')),
  -- Ayni yerlesimde birden fazla reklam varsa secim agirligi
  weight           int not null default 1 check (weight between 1 and 100),
  is_active        boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists ad_slots_pick_idx
  on public.ad_slots (placement, is_active, sort_order);

-- -------------------------------------------------------------
-- 2. IZLEME KAYITLARI
-- -------------------------------------------------------------
-- slot_slug ayri tutuluyor cunku tablo bosken site yerlesik varsayilan
-- reklamlari gosterir; o izlenmelerin de kaydi tutulabilsin diye
-- slot_id NULLABLE.
create table if not exists public.ad_views (
  id              bigint generated always as identity primary key,
  slot_id         bigint references public.ad_slots(id) on delete set null,
  slot_slug       text not null,
  -- Token'in tek kullanimlik nonce'u. UNIQUE: ayni token 30 dk TTL'i icinde
  -- tekrar gonderilirse 23505 unique_violation alir ve sayim artmaz.
  token_nonce     text unique,
  -- IP'nin tuzlu hash'i — ham IP saklanmaz (KVKK/GDPR)
  session_hash    text,
  completed       boolean not null default false,
  watched_seconds int not null default 0 check (watched_seconds >= 0),
  created_at      timestamptz not null default now()
);

create index if not exists ad_views_created_idx on public.ad_views (created_at desc);
create index if not exists ad_views_slug_idx    on public.ad_views (slot_slug);

-- -------------------------------------------------------------
-- 3. updated_at OTOMATIK
-- -------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ad_slots_touch on public.ad_slots;
create trigger ad_slots_touch
  before update on public.ad_slots
  for each row execute procedure public.touch_updated_at();

-- -------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- -------------------------------------------------------------
alter table public.ad_slots enable row level security;
alter table public.ad_views enable row level security;

drop policy if exists "active ad slots are public" on public.ad_slots;
drop policy if exists "admin can manage ad slots"  on public.ad_slots;
drop policy if exists "admin can read ad views"    on public.ad_views;
drop policy if exists "anyone can record a view"   on public.ad_views;

-- Aktif reklamlari herkes okuyabilir (sayfada gosterilecek)
create policy "active ad slots are public" on public.ad_slots
  for select using (is_active = true);

-- Yonetim sadece admin
create policy "admin can manage ad slots" on public.ad_slots
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ⚠️ KRITIK: ad_views icin INSERT politikasi YOK — bilincli.
-- Izlenme kaydi yalnizca /api/ads route'undan, service_role ile atilir.
-- Boylece tarayicidan `fetch('/api/ads', ...)` ile sahte izlenme
-- sismesi yapilamaz; sure HMAC imzali token ile sunucuda dogrulanir.
create policy "admin can read ad views" on public.ad_views
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- -------------------------------------------------------------
-- 5. BASLANGIC REKLAMLARI
-- -------------------------------------------------------------
-- Bunlar kendi projelerine isaret eden "kendi kendine sponsor" birimleri.
-- Gercek reklam agi (AdSense) baglaninca kind='adsense' birimleri ekle.
insert into public.ad_slots
  (slug, title, description, kind, image_url, target_url, sponsor, duration_seconds, placement, sort_order)
values
  ('pixelshield',  'PixelShield',  'Gorsel guvenlik araci — projeyi incele',
   'image', '/projects/pixelshield.png', '/projects', 'PixelShield', 15, 'ads-page', 1),
  ('mythora',      'Mythora',      'Oyun projesi — destek ol',
   'image', '/projects/mythora.png', '/projects', 'Mythora', 15, 'ads-page', 2),
  ('fruity-dev',   'Fruity Dev',   'Arac projesi — goz at',
   'image', '/projects/fruity-dev.png', '/projects', 'Fruity Dev', 15, 'ads-page', 3),
  ('portfolio',    'Portfolyo',    'Tum projelerime goz at',
   'image', '/projects/portfolio.png', '/projects', 'TARNAK', 15, 'ads-page', 4),
  ('donate-timed', 'PixelShield', '15 saniyelik sponsor tanitimi',
   'image', '/projects/pixelshield.png', '/projects', 'PixelShield', 15, 'donate', 1),
  ('sponsor-link', 'GitHub Sponsors', 'Aylik destek ile projelerin gelisimini sagla',
   'link', null, 'https://github.com/sponsors/tarikelertarnak', 'GitHub Sponsors', 10, 'donate', 2),
  ('banner-github', 'GitHub', 'Acik kaynak projelerime yildiz ver',
   'link', null, 'https://github.com/tarikelertarnak', 'GitHub', 8, 'banner', 1)
on conflict (slug) do nothing;

-- -------------------------------------------------------------
-- 6. DOGRULAMA SORGUSU
-- -------------------------------------------------------------
-- Uyguladiktan sonra bunu calistirip 2 satir gormelisin:
--   select 'ad_slots' as tablo, count(*) from public.ad_slots
--   union all
--   select 'ad_views', count(*) from public.ad_views;
