DO $$
DECLARE
  constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT
      format('%I.%I', table_namespace.nspname, table_class.relname) AS table_name,
      conname
    FROM pg_constraint
    JOIN pg_class AS table_class ON table_class.oid = conrelid
    JOIN pg_namespace AS table_namespace ON table_namespace.oid = table_class.relnamespace
    WHERE contype = 'c'
      AND conrelid IN ('public.habitaciones'::regclass, 'public.tarifas'::regclass)
      AND pg_get_constraintdef(pg_constraint.oid) LIKE '%doble%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', constraint_record.table_name, constraint_record.conname);
  END LOOP;
END $$;

UPDATE public.habitaciones
SET tipo = 'individual doble'
WHERE tipo = 'doble';

UPDATE public.tarifas
SET habitacion_tipo = 'individual doble'
WHERE habitacion_tipo = 'doble';

ALTER TABLE public.habitaciones
DROP CONSTRAINT IF EXISTS habitaciones_tipo_check;

ALTER TABLE public.habitaciones
ADD CONSTRAINT habitaciones_tipo_check
CHECK (tipo IN ('individual', 'matrimonial', 'individual doble', 'triple', 'familiar'));

ALTER TABLE public.tarifas
DROP CONSTRAINT IF EXISTS tarifas_habitacion_tipo_check;

ALTER TABLE public.tarifas
ADD CONSTRAINT tarifas_habitacion_tipo_check
CHECK (habitacion_tipo IN ('individual', 'matrimonial', 'individual doble', 'triple', 'familiar'));
