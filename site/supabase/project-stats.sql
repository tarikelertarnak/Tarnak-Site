-- project_stats: sunucu-taraflı indirme/görüntüleme sayaçları (2026-10-21)
-- `site/src/app/api/project-stats/route.ts` kullanır.

CREATE TABLE IF NOT EXISTS public.project_stats (
  title text PRIMARY KEY,
  views integer NOT NULL DEFAULT 0,
  downloads integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_stats public read" ON public.project_stats;
CREATE POLICY "project_stats public read" ON public.project_stats FOR SELECT USING (true);

GRANT SELECT ON public.project_stats TO anon, authenticated;