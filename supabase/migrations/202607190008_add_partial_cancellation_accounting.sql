ALTER TABLE public.cancelaciones
ADD COLUMN IF NOT EXISTS monto_retenido numeric(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.cancelaciones
DROP CONSTRAINT IF EXISTS cancelaciones_politica_aplicada_check;

ALTER TABLE public.cancelaciones
ADD CONSTRAINT cancelaciones_politica_aplicada_check
CHECK (
  politica_aplicada IN (
    'sin_reembolso',
    'reembolso_50',
    'reembolso_total',
    'reembolso_parcial'
  )
);
