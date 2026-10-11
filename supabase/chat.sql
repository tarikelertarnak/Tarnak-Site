-- ============================================================================
-- Chat v2 — konuşma tabanlı mesajlaşma (2026-10-11)
--
-- Neden: eski model `data/chat/messages.json` dosyasına yazıyordu. Cloudflare
-- Workers'ta dosya sistemi YOK → yazma sessizce başarısız, mesajlar KAYBOLUYORDU.
-- Bu şema gerçek kalıcı depolama sağlar.
--
-- UYGULAMA: Supabase SQL Editor'da çalıştır. Tüm ifadeler `if not exists`
-- ile korumalı → tekrar çalıştırmak güvenli, mevcut veriyi silmez.
-- ============================================================================

-- ---------- conversations (sohbet başlıkları) ----------
-- kind: 'direct' (birebir) | 'group' (grup)
-- Kullanıcı ile site sahibi arasındaki birebir sohbet de burada; `direct_key`
-- sayesinde her iki taraf için de tek ve aynı satır bulunur.
create table if not exists public.chat_conversations (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null default 'direct' check (kind in ('direct', 'group')),
  -- 'direct' için tarafları alfabetik sırayla birleştirir: a|b
  direct_key     text unique,
  title          text,                       -- grup adı (direct'ta null)
  -- ÖNEMLİ KİŞİ: kullanıcı "önemli" işaretlerse bildirim gürültülü/sesli olur.
  important      boolean not null default false,
  favorite       boolean not null default false,
  -- ENGELLİ (2026-10-11): admin bir kullanıcıyı engelleyince bu sohbet
  -- listeden düşer ve yeni mesaj gönderilemez.
  blocked        boolean not null default false,
  -- LİSTE ÖĞESİ için son mesaj özeti (2026-10-11). Denormalize: gönderim
  -- sırasında bir kez yazılır, liste okunurken N+1 sorgu olmaz.
  -- Grup sohbetinde "Osman: Tamam" diye gösterilir → `last_sender_name` ayrı.
  last_preview      text,
  last_sender_name  text,
  -- silinen mesajların admin'e GÖRÜNMESİ için yumuşak silme (retention):
  --   'off'    → silinen mesaj herkesten gider, admin de göremez
  --   'forever'→ admin süresiz görebilir
  --   '30 days'→ admin 30 gün görebilir, sonra kalıcı olarak silinir
  deleted_retention text not null default '30 days'
    check (deleted_retention in ('off', 'forever', '7 days', '30 days', '90 days')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- participants (sohbete katılanlar) ----------
--
-- user_id BİLEREK `text` ve FK'siz (2026-10-11 ölçümü):
--   Site sahibi iki farklı kimlikle giriş yapabiliyor.
--     1) `/sign` → Supabase Auth UUID  (profiles.id ile aynı)
--     2) `/login` → admin.json oturumu → id = `admin:TARIKELERTARNAK`
--   İkinci kimlik UUID DEĞİL; `uuid references auth.users(id)` ile admin
--   herhangi biriyle sohbet açmaya çalıştığında "invalid input syntax for
--   type uuid" hatası alıyordu (canlı ölçüm: id = "admin:TARIKELERTARNAK").
--   Katılım bu yüzden metin tutar; bütünlük uygulama katmanında
--   (isParticipant + getSessionUser) doğrulanıyor.
create table if not exists public.chat_participants (
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id         text not null,
  -- 'member' | 'admin' (grup sahibi = site sahibi)
  role            text not null default 'member' check (role in ('member', 'admin')),
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ---------- messages ----------
create table if not exists public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id       text not null,
  sender_name     text not null,

  text            text,
  kind            text not null default 'text'
                    check (kind in ('text', 'image', 'file', 'audio', 'video')),

  -- dosya/ses/görsel
  file_url        text,
  file_name       text,
  file_type       text,
  file_size       integer,

  -- sesli mesaj süresi (ms) — sesli mesaj oynatıcısı için
  audio_duration  integer,

  -- YANIT: "şu mesaja cevap veriyorum". tıklanınca kaynak mesaja gider.
  reply_to_id     uuid references public.chat_messages(id) on delete set null,

  -- okundu bilgisi (WhatsApp ✓✓ = teslim, ✓ = okundu)
  delivered_at    timestamptz,
  read_at         timestamptz,

  -- SABİTLENMİŞ mesaj (herkes sabitleyebilir)
  pinned          boolean not null default false,
  pinned_at       timestamptz,

  -- HERKESTEN SİLME (yumuşak silme):
  --   deleted_for_all=true → mesaj gizlenir, "Bu mesajı sildiniz" gösterilir
  --   admin ise deleted_retention boyunca GERÇEK içeriği görebilir
  deleted_for_all boolean not null default false,
  deleted_by      text,
  deleted_at      timestamptz,

  created_at      timestamptz not null default now()
);

-- performans: sohbet mesajlarını kronolojik okuma
create index if not exists chat_messages_conv_created_idx
  on public.chat_messages (conversation_id, created_at desc);
-- silinmemişleri filtreleme (kısmi indeks)
create index if not exists chat_messages_visible_idx
  on public.chat_messages (conversation_id) where deleted_for_all = false;

-- ============================================================================
-- RLS (Row Level Security)
--
-- Tüm erişim SUNUCU üzerinden service-role ile yapılır (RLS bypass). Burada
-- RLS "kapatık" tutulur → anon key ile ASLA erişilemez. Kullanıcı yetkisi
-- her istekte session'dan kontrol edilir (bkz. src/app/api/chat/*).
-- ============================================================================
alter table public.chat_conversations enable row level security;
alter table public.chat_participants  enable row level security;
alter table public.chat_messages      enable row level security;

-- Politika tanımlanmıyor: RLS açık ama policy yok → varsayılan olarak
-- TÜM erişim reddedilir. Sadece service-role (RLS bypass) yazabilir/okuyabilir.
-- Bu, tablo yanlışlıkla istemciden sorgulanırsa veri sızmaz.

-- ============================================================================
-- Temizlik: silinen sohbeti ve mesajları temizlemek için (kullanıcı isteği)
-- ============================================================================
-- delete from public.chat_messages where conversation_id = '...';
-- delete from public.chat_participants where conversation_id = '...';
-- delete from public.chat_conversations where id = '...';

-- ============================================================================
-- SONRADAN EKLENEN SÜTUNLAR (idempotent — dosyayı tekrar çalıştırmak güvenli)
--
-- `create table if not exists` ZATEN KURULU bir tabloya yeni sütun EKLEMEZ.
-- 2026-10-11'de bu dosyanın ilk sürümünü çalıştıran biri için aşağıdaki
-- satırlar şart; yeni kurulumda ise hiçbir şey yapmaz.
-- ============================================================================
alter table public.chat_conversations add column if not exists blocked boolean not null default false;
alter table public.chat_conversations add column if not exists favorite boolean not null default false;
alter table public.chat_conversations add column if not exists important boolean not null default false;
alter table public.chat_conversations add column if not exists last_preview text;
alter table public.chat_conversations add column if not exists last_sender_name text;
alter table public.chat_conversations add column if not exists deleted_retention text not null default '30 days';