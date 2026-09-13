-- La tarifa de una habitación se mantiene por su FK habitaciones.tarifa_id.
-- Se elimina la prioridad por peso; el cambio de tarifa se hace manualmente
-- editando la habitación.

DROP INDEX IF EXISTS public.tarifas_tipo_temporada_peso_activa_uidx;
DROP INDEX IF EXISTS public.tarifas_prioridad_vigencia_idx;

ALTER TABLE public.tarifas
  DROP CONSTRAINT IF EXISTS tarifas_peso_check;

ALTER TABLE public.tarifas
  DROP COLUMN IF EXISTS peso;

NOTIFY pgrst, 'reload schema';
