ALTER TABLE public.reservas
ADD COLUMN IF NOT EXISTS checkin_programado_at timestamptz,
ADD COLUMN IF NOT EXISTS checkout_programado_at timestamptz;

CREATE INDEX IF NOT EXISTS reservas_habitacion_programacion_idx
ON public.reservas (habitacion_id, checkin_programado_at, checkout_programado_at);

CREATE UNIQUE INDEX IF NOT EXISTS configuracion_hostal_clave_uidx
ON public.configuracion_hostal (clave);

INSERT INTO public.configuracion_hostal (clave, valor, descripcion)
VALUES
  ('reserva_checkin_hora', '14:00', 'Hora estándar desde la que el huésped puede ocupar la habitación.'),
  ('reserva_checkout_hora', '12:00', 'Hora límite en la que el huésped debe desocupar la habitación.'),
  ('reserva_turnover_minutos', '120', 'Minutos calculados automáticamente entre check-out y nuevo check-in para limpieza/preparación.'),
  ('reserva_timezone', 'America/La_Paz', 'Zona horaria operativa fija para Bolivia.')
ON CONFLICT (clave) DO NOTHING;

UPDATE public.reservas
SET
  checkin_programado_at = COALESCE(
    checkin_programado_at,
    (fecha_ingreso::date + time '14:00') AT TIME ZONE 'America/La_Paz'
  ),
  checkout_programado_at = COALESCE(
    checkout_programado_at,
    (fecha_salida::date + time '12:00') AT TIME ZONE 'America/La_Paz'
  )
WHERE checkin_programado_at IS NULL
   OR checkout_programado_at IS NULL;

NOTIFY pgrst, 'reload schema';
