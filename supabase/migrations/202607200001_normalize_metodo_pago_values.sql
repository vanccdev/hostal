ALTER TABLE public.transacciones
DROP CONSTRAINT IF EXISTS transacciones_metodo_pago_check;

UPDATE public.transacciones
SET metodo_pago = 'qr'
WHERE metodo_pago IN ('qr_simple_tigo', 'qr_simple_bnb', 'qr_otro');

ALTER TABLE public.transacciones
ADD CONSTRAINT transacciones_metodo_pago_check
CHECK (metodo_pago IN ('qr', 'tarjeta', 'efectivo'));
