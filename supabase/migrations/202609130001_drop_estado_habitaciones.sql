-- Elimina el módulo operativo de estado manual de habitaciones.
-- La disponibilidad continúa calculándose con reservas y bloqueos_fechas.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'estado_habitaciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.estado_habitaciones;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'log_estados_habitacion'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.log_estados_habitacion;
  END IF;
END $$;

DROP TABLE IF EXISTS public.log_estados_habitacion;
DROP TABLE IF EXISTS public.estado_habitaciones;
