DROP INDEX IF EXISTS public.tarifas_habitacion_id_idx;

ALTER TABLE public.tarifas
DROP COLUMN IF EXISTS habitacion_id;

NOTIFY pgrst, 'reload schema';
