INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobante',
  'comprobante',
  true,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.comprobantes
ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES public.usuarios(id),
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.notificaciones
ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES public.usuarios(id);

CREATE INDEX IF NOT EXISTS comprobantes_reserva_id_idx
ON public.comprobantes (reserva_id);

CREATE INDEX IF NOT EXISTS comprobantes_uploaded_by_idx
ON public.comprobantes (uploaded_by);

CREATE INDEX IF NOT EXISTS notificaciones_usuario_id_idx
ON public.notificaciones (usuario_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'reservas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notificaciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
  END IF;
END $$;
