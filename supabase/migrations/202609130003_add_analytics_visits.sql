CREATE TABLE IF NOT EXISTS public.analytics_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  path text NOT NULL,
  referrer text,
  source text NOT NULL DEFAULT 'directo',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country_code text,
  device_type text NOT NULL DEFAULT 'unknown',
  browser text NOT NULL DEFAULT 'unknown',
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 0,
  is_bounce boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS analytics_visits_started_at_idx
  ON public.analytics_visits (started_at DESC);
CREATE INDEX IF NOT EXISTS analytics_visits_session_id_idx
  ON public.analytics_visits (session_id);
CREATE INDEX IF NOT EXISTS analytics_visits_source_idx
  ON public.analytics_visits (source);
CREATE INDEX IF NOT EXISTS analytics_visits_country_code_idx
  ON public.analytics_visits (country_code);

ALTER TABLE public.analytics_visits ENABLE ROW LEVEL SECURITY;

-- La escritura se realiza exclusivamente desde el endpoint server-side con service role.
-- No se crean políticas para visitantes anónimos ni se almacena la IP completa.

NOTIFY pgrst, 'reload schema';
