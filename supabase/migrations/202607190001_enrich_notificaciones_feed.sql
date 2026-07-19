ALTER TABLE public.notificaciones
ADD COLUMN IF NOT EXISTS titulo text,
ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES public.usuarios(id),
ADD COLUMN IF NOT EXISTS entidad text,
ADD COLUMN IF NOT EXISTS entidad_id uuid,
ADD COLUMN IF NOT EXISTS accion text,
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.notificaciones
ALTER COLUMN leida SET DEFAULT false;

UPDATE public.notificaciones
SET
  titulo = COALESCE(titulo, mensaje),
  accion = COALESCE(accion, tipo::text),
  entidad = COALESCE(entidad, CASE WHEN reserva_id IS NOT NULL THEN 'reservas' ELSE 'sistema' END),
  entidad_id = COALESCE(entidad_id, reserva_id),
  metadata = COALESCE(metadata, '{}'::jsonb)
WHERE titulo IS NULL
  OR accion IS NULL
  OR entidad IS NULL
  OR entidad_id IS NULL
  OR metadata IS NULL;

CREATE INDEX IF NOT EXISTS notificaciones_leida_created_at_idx
ON public.notificaciones (leida, created_at DESC);

CREATE INDEX IF NOT EXISTS notificaciones_accion_created_at_idx
ON public.notificaciones (accion, created_at DESC);

CREATE INDEX IF NOT EXISTS notificaciones_entidad_idx
ON public.notificaciones (entidad, entidad_id);

CREATE INDEX IF NOT EXISTS notificaciones_actor_id_idx
ON public.notificaciones (actor_id);
