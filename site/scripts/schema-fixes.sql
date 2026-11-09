-- =============================================================
-- Eksik kolonlar — idempotent onarim (2026-09-22)
-- =============================================================
-- Uygulama: Supabase Dashboard -> SQL Editor -> bu dosyayi yapistir -> Run.
-- Guvenli: `if not exists` kullanir, tekrar calistirilabilir.
-- =============================================================

-- -------------------------------------------------------------
-- 1. messages.phone  — BULUNAN GERCEK HATA
-- -------------------------------------------------------------
-- `src/app/api/contact/route.ts` iletisim formundan gelen `phone` alanini
-- insert ediyordu, ama `messages` tablosunda o kolon YOKTU.
-- PostgREST hatasi: 42703 "column messages.phone does not exist"
--
-- Sonuc zinciri:
--   insert 42703 ile dustu -> hata yalnizca console.error'a yazildi
--   -> sendToDiscord() webhook tanimsizken `true` donuyordu (yanlis)
--   -> API kullaniciya {"success": true, "Message sent successfully!"} dedi
--   -> MESAJ HICBIR YERE KAYDEDILMEDI.
--
-- Bu kolon eklendikten sonra telefon bilgisi kalici olarak saklanir.
alter table public.messages
  add column if not exists phone text;

-- -------------------------------------------------------------
-- 2. ad_views.token_nonce — tekrar oynatma korumasi
-- -------------------------------------------------------------
-- Reklam sistemi `token_nonce` UNIQUE kolonuna guveniyor; ayni token 30 dk
-- TTL'i icinde tekrar gonderilirse 23505 alip sayimi artirmiyor.
-- (scripts/schema-ads.sql tabloyu sifirdan kuruyorsa bu blok gereksizdir;
--  tablo zaten varsa kolonu ekler.)
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'ad_views') then
    alter table public.ad_views add column if not exists token_nonce text;
    begin
      alter table public.ad_views add constraint ad_views_token_nonce_key unique (token_nonce);
    exception
      when duplicate_table then null;   -- kisit zaten var
      when duplicate_object then null;
    end;
  end if;
end $$;

-- -------------------------------------------------------------
-- DOGRULAMA
-- -------------------------------------------------------------
-- select column_name, data_type from information_schema.columns
-- where table_schema='public' and table_name='messages'
-- order by ordinal_position;
--
-- Beklenen: phone kolonu listede gorunur.
