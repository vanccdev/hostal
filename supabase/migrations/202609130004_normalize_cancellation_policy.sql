-- Política vigente: desde 48:00 horas de anticipación se devuelve el 20%
-- y el hostal retiene el 80%; con menos de 48:00 no hay reembolso.
INSERT INTO public.configuracion_hostal (clave, valor, descripcion)
VALUES
  (
    'cancelacion_reembolso_parcial_horas',
    '48',
    'Horas mínimas de anticipación, incluyendo exactamente 48:00, para aplicar el reembolso parcial.'
  ),
  (
    'cancelacion_reembolso_parcial_porcentaje',
    '20',
    'Porcentaje del importe pagado que se devuelve con 48 horas o más de anticipación.'
  )
ON CONFLICT (clave) DO UPDATE
SET
  valor = EXCLUDED.valor,
  descripcion = EXCLUDED.descripcion,
  updated_at = now();

-- Esta clave pertenece a la política anterior y ya no es utilizada por la app.
UPDATE public.configuracion_hostal
SET descripcion = 'Parámetro legado; la política vigente usa un único corte de 48 horas.',
    updated_at = now()
WHERE clave = 'cancelacion_sin_reembolso_horas';

-- La contabilidad también se valida dentro de Supabase para que ningún
-- llamador con permiso de service_role pueda registrar una combinación
-- distinta de la política vigente.
CREATE OR REPLACE FUNCTION public.cancel_reservation_with_accounting(
  p_reserva_id uuid,
  p_motivo text,
  p_horas_anticipacion integer,
  p_politica_aplicada varchar,
  p_monto_pagado_aprobado numeric,
  p_retencion_porcentaje_aplicado numeric,
  p_monto_reembolso numeric,
  p_monto_retenido numeric,
  p_gestionado_por uuid,
  p_motivo_ajuste text,
  p_nota text
)
RETURNS TABLE (reserva_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partial_hours integer;
  v_partial_percent numeric;
  v_paid numeric := GREATEST(0, COALESCE(p_monto_pagado_aprobado, 0));
  v_refund numeric := GREATEST(0, COALESCE(p_monto_reembolso, 0));
  v_retained numeric := GREATEST(0, COALESCE(p_monto_retenido, 0));
BEGIN
  SELECT
    COALESCE(MAX(valor) FILTER (WHERE clave = 'cancelacion_reembolso_parcial_horas')::integer, 48),
    COALESCE(MAX(valor) FILTER (WHERE clave = 'cancelacion_reembolso_parcial_porcentaje')::numeric, 20)
  INTO v_partial_hours, v_partial_percent
  FROM public.configuracion_hostal
  WHERE clave IN ('cancelacion_reembolso_parcial_horas', 'cancelacion_reembolso_parcial_porcentaje');

  IF p_horas_anticipacion >= v_partial_hours THEN
    IF p_politica_aplicada <> 'reembolso_parcial'
      OR ABS(COALESCE(p_retencion_porcentaje_aplicado, 0) - (100 - v_partial_percent)) > 0.01
      OR ABS(v_refund - ROUND(v_paid * v_partial_percent / 100, 2)) > 0.01
      OR ABS(v_retained - ROUND(v_paid * (100 - v_partial_percent) / 100, 2)) > 0.01 THEN
      RAISE EXCEPTION 'Los montos no cumplen la política de reembolso parcial vigente.';
    END IF;
  ELSE
    IF p_politica_aplicada <> 'sin_reembolso'
      OR ABS(COALESCE(p_retencion_porcentaje_aplicado, 0) - 100) > 0.01
      OR ABS(v_refund) > 0.01
      OR ABS(v_retained - ROUND(v_paid, 2)) > 0.01 THEN
      RAISE EXCEPTION 'Los montos no cumplen la política de cancelación sin reembolso vigente.';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.cancelaciones c WHERE c.reserva_id = p_reserva_id) THEN
    RAISE EXCEPTION 'Esta reserva ya tiene una cancelación registrada.';
  END IF;

  INSERT INTO public.cancelaciones (
    reserva_id,
    motivo,
    horas_anticipacion,
    politica_aplicada,
    monto_pagado_aprobado,
    retencion_porcentaje_aplicado,
    monto_reembolso,
    monto_retenido,
    gestionado_por
  )
  VALUES (
    p_reserva_id,
    p_motivo,
    GREATEST(0, p_horas_anticipacion)::smallint,
    p_politica_aplicada,
    v_paid,
    LEAST(100, GREATEST(0, p_retencion_porcentaje_aplicado)),
    v_refund,
    v_retained,
    p_gestionado_por
  );

  UPDATE public.reservas r
  SET
    estado = 'cancelada',
    precio_ajustado = v_retained,
    motivo_ajuste = p_motivo_ajuste,
    notas_internas = CASE
      WHEN r.notas_internas IS NULL OR r.notas_internas = '' THEN p_nota
      ELSE r.notas_internas || E'\n' || p_nota
    END,
    updated_at = now()
  WHERE r.id = p_reserva_id
    AND r.estado IN ('pendiente_pago', 'confirmada', 'checkin');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta reserva ya no puede cancelarse desde este flujo.';
  END IF;

  RETURN QUERY SELECT p_reserva_id;
END;
$$;
