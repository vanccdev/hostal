INSERT INTO public.configuracion_hostal (clave, valor, descripcion)
VALUES
  (
    'reserva_comprobante_espera_minutos',
    '120',
    'Minutos de espera para recibir comprobante antes de cancelar automáticamente una reserva pendiente de pago. Usa 0 para desactivar.'
  )
ON CONFLICT (clave) DO NOTHING;

NOTIFY pgrst, 'reload schema';
