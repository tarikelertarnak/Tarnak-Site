-- Preserve the previous admin-managed copy privately, then clear unverified
-- about-page text so the site shows its empty state until the owner adds copy.
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

CREATE TABLE IF NOT EXISTS public.about_page_archive (
  id text PRIMARY KEY,
  about_page jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.about_page_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.about_page_archive FROM anon, authenticated;

INSERT INTO public.about_page_archive (id, about_page)
SELECT id, content -> 'aboutPage'
FROM public.site_content
WHERE content -> 'aboutPage' IS NOT NULL
  AND content -> 'aboutPage' <> 'null'::jsonb
ON CONFLICT (id) DO NOTHING;

UPDATE public.site_content
SET content = jsonb_set(
  content,
  '{aboutPage}',
  '{"title":{"tr":"","en":""},"intro":{"tr":"","en":""},"areas":[],"journey":[],"values":[],"closing":{"tr":"","en":""}}'::jsonb,
  true
), updated_at = now()
WHERE content -> 'aboutPage' IS NOT NULL
  AND content -> 'aboutPage' <> '{"title":{"tr":"","en":""},"intro":{"tr":"","en":""},"areas":[],"journey":[],"values":[],"closing":{"tr":"","en":""}}'::jsonb;
