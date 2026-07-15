ALTER TABLE public.reservas
DROP COLUMN IF EXISTS checkin_at,
DROP COLUMN IF EXISTS checkout_at;

NOTIFY pgrst, 'reload schema';
