INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'habitaciones',
  'habitaciones',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid() AND activo = true;
$$;

CREATE OR REPLACE FUNCTION public.is_management()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_app_role() IN ('admin', 'recepcionista');
$$;

CREATE TABLE IF NOT EXISTS public.img_habitaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habitacion_id uuid NOT NULL REFERENCES public.habitaciones(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT img_habitaciones_url_not_blank CHECK (length(btrim(url)) > 0),
  CONSTRAINT img_habitaciones_habitacion_url_key UNIQUE (habitacion_id, url)
);

CREATE INDEX IF NOT EXISTS img_habitaciones_habitacion_id_idx
ON public.img_habitaciones (habitacion_id);

ALTER TABLE public.img_habitaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "img_habitaciones_read" ON public.img_habitaciones;
CREATE POLICY "img_habitaciones_read"
ON public.img_habitaciones FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "img_habitaciones_management_write" ON public.img_habitaciones;
CREATE POLICY "img_habitaciones_management_write"
ON public.img_habitaciones FOR ALL
USING (public.is_management())
WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "habitaciones_storage_read" ON storage.objects;
CREATE POLICY "habitaciones_storage_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'habitaciones');

DROP POLICY IF EXISTS "habitaciones_storage_management_insert" ON storage.objects;
CREATE POLICY "habitaciones_storage_management_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'habitaciones' AND public.is_management());

DROP POLICY IF EXISTS "habitaciones_storage_management_update" ON storage.objects;
CREATE POLICY "habitaciones_storage_management_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'habitaciones' AND public.is_management())
WITH CHECK (bucket_id = 'habitaciones' AND public.is_management());

DROP POLICY IF EXISTS "habitaciones_storage_management_delete" ON storage.objects;
CREATE POLICY "habitaciones_storage_management_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'habitaciones' AND public.is_management());
