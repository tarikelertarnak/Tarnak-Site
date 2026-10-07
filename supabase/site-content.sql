-- ============================================================
-- Site içeriği kalıcılığı (2026-10-06)
--
-- SORUN: `saveContent()` YALNIZCA diske yazıyordu
-- (`fs.writeFile(data/content.json)`). Cloudflare Workers'ta dosya
-- sistemi SALT-OKUNURDUR → yazma EROFS ile başarısız oluyor,
-- admin paneli "Kalıcı değil" uyarısı veriyordu ve her deploy'da
-- içerik geri alınıyordu.
--
-- ÇÖZÜM: içerik JSONB olarak `site_content` tablosunda tutulur.
-- Tek satır (`id = 'main'`), yazma tamamen KV/Postgres tarafında.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_content (
  id          text PRIMARY KEY DEFAULT 'main',
  content     jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Tek satır korunur; upsert için gerekli.
INSERT INTO public.site_content (id, content)
VALUES ('main', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Servis rolü (service_role) zaten tüm yetkilere sahip; RLS açmak
-- gereksiz. Yine de anonim okuma KAPALI kalsın.
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Okuma: yalnızca servis rolü (anon/authenticated erişemez).
-- Not: PostgREST varsayılan olarak service_role'ü RLS'ten muaf tutar.
REVOKE ALL ON public.site_content FROM anon, authenticated;

-- DDL doğrulaması
SELECT 'site_content hazir' AS status, count(*) AS satir FROM public.site_content;