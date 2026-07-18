UPDATE auth.users AS auth_user
SET raw_user_meta_data = COALESCE(auth_user.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('telefono', huesped.telefono)
FROM public.huespedes AS huesped
WHERE huesped.usuario_id = auth_user.id
  AND huesped.telefono IS NOT NULL
  AND btrim(huesped.telefono) <> ''
  AND NOT COALESCE(auth_user.raw_user_meta_data, '{}'::jsonb) ? 'telefono';

UPDATE public.usuarios AS usuario
SET nombre = huesped.nombre_completo
FROM public.huespedes AS huesped
WHERE huesped.usuario_id = usuario.id
  AND huesped.nombre_completo IS NOT NULL
  AND btrim(huesped.nombre_completo) <> ''
  AND btrim(usuario.nombre) = '';

DELETE FROM public.huespedes
WHERE usuario_id IS NULL;

ALTER TABLE public.huespedes
  ALTER COLUMN usuario_id SET NOT NULL,
  DROP COLUMN IF EXISTS nombre_completo,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS telefono;

CREATE UNIQUE INDEX IF NOT EXISTS huespedes_usuario_id_uidx
ON public.huespedes (usuario_id);

NOTIFY pgrst, 'reload schema';
