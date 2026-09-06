INSERT INTO public.configuracion_hostal (clave, valor, descripcion)
VALUES
  (
    'cancelacion_reembolso_parcial_horas',
    '48',
    'Horas mínimas antes del check-in para aplicar el reembolso parcial.'
  ),
  (
    'cancelacion_sin_reembolso_horas',
    '24',
    'Horas antes del check-in por debajo de las cuales no se realiza reembolso.'
  ),
  (
    'cancelacion_reembolso_parcial_porcentaje',
    '20',
    'Porcentaje del importe pagado que se reembolsa con más de 48 horas de anticipación.'
  )
ON CONFLICT (clave) DO UPDATE
SET
  valor = EXCLUDED.valor,
  descripcion = EXCLUDED.descripcion,
  updated_at = now();
