INSERT INTO public.configuracion_hostal (clave, valor, descripcion)
VALUES
  (
    'cancelacion_reembolso_horas',
    '12',
    'Horas antes del check-in programado hasta las que una cancelación de huésped aplica a reembolso total.'
  ),
  (
    'cancelacion_retencion_porcentaje',
    '20',
    'Porcentaje retenido del monto pagado cuando la cancelación ocurre después del corte de reembolso total.'
  )
ON CONFLICT (clave) DO UPDATE
SET
  valor = EXCLUDED.valor,
  descripcion = EXCLUDED.descripcion,
  updated_at = now();
