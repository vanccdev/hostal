CREATE OR REPLACE FUNCTION public.cancel_reservation_with_accounting(
  p_reserva_id uuid,
  p_motivo text,
  p_horas_anticipacion integer,
  p_politica_aplicada varchar,
  p_monto_reembolso numeric,
  p_monto_retenido numeric,
  p_gestionado_por uuid,
  p_motivo_ajuste text,
  p_nota text
)
RETURNS TABLE (
  reserva_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.cancelaciones c
    WHERE c.reserva_id = p_reserva_id
  ) THEN
    RAISE EXCEPTION 'Esta reserva ya tiene una cancelación registrada.';
  END IF;

  INSERT INTO public.cancelaciones (
    reserva_id,
    motivo,
    horas_anticipacion,
    politica_aplicada,
    monto_reembolso,
    monto_retenido,
    gestionado_por
  )
  VALUES (
    p_reserva_id,
    p_motivo,
    GREATEST(0, p_horas_anticipacion)::smallint,
    p_politica_aplicada,
    p_monto_reembolso,
    p_monto_retenido,
    p_gestionado_por
  );

  UPDATE public.reservas r
  SET
    estado = 'cancelada',
    precio_ajustado = p_monto_retenido,
    motivo_ajuste = p_motivo_ajuste,
    notas_internas = CASE
      WHEN r.notas_internas IS NULL OR r.notas_internas = ''
        THEN p_nota
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

REVOKE ALL ON FUNCTION public.cancel_reservation_with_accounting(
  uuid,
  text,
  integer,
  varchar,
  numeric,
  numeric,
  uuid,
  text,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cancel_reservation_with_accounting(
  uuid,
  text,
  integer,
  varchar,
  numeric,
  numeric,
  uuid,
  text,
  text
) TO service_role;
