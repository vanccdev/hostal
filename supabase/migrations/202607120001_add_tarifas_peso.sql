ALTER TABLE public.tarifas
ADD COLUMN IF NOT EXISTS peso smallint NOT NULL DEFAULT 0;

ALTER TABLE public.tarifas
DROP CONSTRAINT IF EXISTS tarifas_peso_check;

ALTER TABLE public.tarifas
ADD CONSTRAINT tarifas_peso_check CHECK (peso IN (0, 1, 2, 3));

CREATE INDEX IF NOT EXISTS tarifas_prioridad_vigencia_idx
ON public.tarifas (habitacion_tipo, activa, vigente_desde, vigente_hasta, peso);

CREATE UNIQUE INDEX IF NOT EXISTS tarifas_tipo_temporada_peso_activa_uidx
ON public.tarifas (habitacion_tipo, temporada, peso)
WHERE activa IS TRUE;
