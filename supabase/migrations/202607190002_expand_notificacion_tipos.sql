ALTER TABLE public.notificaciones
DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;

ALTER TABLE public.notificaciones
ADD CONSTRAINT notificaciones_tipo_check
CHECK (
  tipo::text = ANY (
    ARRAY[
      'overbooking',
      'pago_pendiente',
      'checkin_hoy',
      'checkout_hoy',
      'mantenimiento',
      'cliente',
      'reserva',
      'pago',
      'habitacion',
      'huesped',
      'tarifa',
      'sistema',
      'seguridad'
    ]::text[]
  )
);

UPDATE public.notificaciones
SET tipo = CASE
  WHEN accion LIKE 'cliente.%' OR entidad = 'usuarios' THEN 'cliente'
  WHEN accion LIKE 'reserva.%' OR entidad = 'reservas' THEN 'reserva'
  WHEN accion LIKE 'pago.%' OR entidad = 'transacciones' THEN 'pago'
  WHEN accion LIKE 'habitacion.%' OR entidad = 'habitaciones' THEN 'habitacion'
  WHEN accion LIKE 'huesped.%' OR entidad = 'huespedes' THEN 'huesped'
  WHEN accion LIKE 'tarifa.%' OR entidad = 'tarifas' THEN 'tarifa'
  WHEN accion LIKE 'sistema.%' OR entidad = 'configuracion_hostal' THEN 'sistema'
  ELSE tipo
END
WHERE accion IS NOT NULL OR entidad IS NOT NULL;
