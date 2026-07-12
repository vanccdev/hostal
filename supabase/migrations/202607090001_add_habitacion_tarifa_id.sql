ALTER TABLE public.habitaciones
ADD COLUMN IF NOT EXISTS tarifa_id uuid REFERENCES public.tarifas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS habitaciones_tarifa_id_idx ON public.habitaciones(tarifa_id);

WITH ranked_tarifas AS (
  SELECT
    habitacion_id,
    id AS tarifa_id,
    row_number() OVER (
      PARTITION BY habitacion_id
      ORDER BY activa DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_number
  FROM public.tarifas
  WHERE habitacion_id IS NOT NULL
)
UPDATE public.habitaciones AS habitaciones
SET tarifa_id = ranked_tarifas.tarifa_id
FROM ranked_tarifas
WHERE habitaciones.id = ranked_tarifas.habitacion_id
  AND habitaciones.tarifa_id IS NULL
  AND ranked_tarifas.row_number = 1;

NOTIFY pgrst, 'reload schema';
