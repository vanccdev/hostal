DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'transacciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transacciones;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'comprobantes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comprobantes;
  END IF;
END $$;
