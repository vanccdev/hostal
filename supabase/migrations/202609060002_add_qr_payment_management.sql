INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qr',
  'qr',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.qr_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  url text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  activa boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qr_pagos_nombre_not_blank CHECK (length(btrim(nombre)) > 0),
  CONSTRAINT qr_pagos_url_not_blank CHECK (length(btrim(url)) > 0)
);

CREATE INDEX IF NOT EXISTS qr_pagos_activa_idx
ON public.qr_pagos (activa, created_at DESC);

ALTER TABLE public.qr_pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_pagos_management" ON public.qr_pagos;
CREATE POLICY "qr_pagos_management"
ON public.qr_pagos FOR ALL
USING (public.is_management())
WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "qr_storage_read" ON storage.objects;
CREATE POLICY "qr_storage_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'qr');

DROP POLICY IF EXISTS "qr_storage_management_insert" ON storage.objects;
CREATE POLICY "qr_storage_management_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'qr' AND public.is_management());

DROP POLICY IF EXISTS "qr_storage_management_update" ON storage.objects;
CREATE POLICY "qr_storage_management_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'qr' AND public.is_management())
WITH CHECK (bucket_id = 'qr' AND public.is_management());

DROP POLICY IF EXISTS "qr_storage_management_delete" ON storage.objects;
CREATE POLICY "qr_storage_management_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'qr' AND public.is_management());
