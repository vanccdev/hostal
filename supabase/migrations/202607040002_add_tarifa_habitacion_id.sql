ALTER TABLE public.tarifas
ADD COLUMN IF NOT EXISTS habitacion_id uuid REFERENCES public.habitaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tarifas_habitacion_id_idx ON public.tarifas(habitacion_id);

NOTIFY pgrst, 'reload schema';
