DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'habitaciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.habitaciones;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'bloqueos_fechas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bloqueos_fechas;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'estado_habitaciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.estado_habitaciones;
  END IF;
END $$;
