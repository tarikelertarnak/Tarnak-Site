-- Hakkımda sayfası için boş, iki dilli başlangıç şeması.
-- Doğrulanmamış profil metni seed edilmez; kullanıcı admin panelinden yazar.

CREATE TABLE IF NOT EXISTS public.site_content (
  id text PRIMARY KEY DEFAULT 'main',
  content jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_content (id, content)
VALUES ('main', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_content FROM anon, authenticated;

UPDATE public.site_content
SET content = jsonb_set(
  content,
  '{aboutPage}',
  '{"title":{"tr":"","en":""},"intro":{"tr":"","en":""},"areas":[],"journey":[],"values":[],"closing":{"tr":"","en":""}}'::jsonb,
  true
), updated_at = now()
WHERE id = 'main'
  AND content -> 'aboutPage' IS NULL;
