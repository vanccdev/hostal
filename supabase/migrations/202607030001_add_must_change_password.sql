ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false NOT NULL;

