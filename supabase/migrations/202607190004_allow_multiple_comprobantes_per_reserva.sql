ALTER TABLE public.comprobantes
DROP CONSTRAINT IF EXISTS comprobantes_reserva_id_key;

DROP INDEX IF EXISTS public.comprobantes_reserva_id_key;

CREATE INDEX IF NOT EXISTS comprobantes_reserva_id_idx
ON public.comprobantes (reserva_id);

CREATE INDEX IF NOT EXISTS comprobantes_transaccion_id_idx
ON public.comprobantes (transaccion_id);
