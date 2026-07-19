CREATE OR REPLACE FUNCTION public.auto_cancel_expired_pending_reservations(
  p_timeout_minutes integer,
  p_cutoff timestamp without time zone,
  p_reservation_id uuid DEFAULT NULL
)
RETURNS TABLE (
  reserva_id uuid,
  codigo_reserva varchar,
  huesped_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT
      r.id,
      r.codigo_reserva,
      r.huesped_id,
      r.fecha_ingreso,
      r.checkin_programado_at,
      r.registrado_por,
      r.notas_internas
    FROM public.reservas r
    WHERE r.estado = 'pendiente_pago'
      AND r.created_at <= p_cutoff
      AND (p_reservation_id IS NULL OR r.id = p_reservation_id)
    ORDER BY r.created_at
    LIMIT 200
  ),
  expired AS (
    SELECT c.*
    FROM candidates c
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.transacciones t
      WHERE t.reserva_id = c.id
        AND t.tipo = 'pago'
        AND t.estado_verificacion IN ('por_verificar', 'aprobada')
        AND t.comprobante_url IS NOT NULL
    )
  ),
  updated AS (
    UPDATE public.reservas r
    SET
      estado = 'cancelada',
      updated_at = now(),
      notas_internas = CASE
        WHEN e.notas_internas IS NULL OR e.notas_internas = ''
          THEN 'Cancelada automáticamente por falta de comprobante después de ' || p_timeout_minutes || ' minutos. Corte: ' || p_cutoff || '.'
        ELSE e.notas_internas || E'\n' || 'Cancelada automáticamente por falta de comprobante después de ' || p_timeout_minutes || ' minutos. Corte: ' || p_cutoff || '.'
      END
    FROM expired e
    WHERE r.id = e.id
      AND r.estado = 'pendiente_pago'
    RETURNING
      r.id,
      r.codigo_reserva,
      r.huesped_id,
      r.fecha_ingreso,
      r.checkin_programado_at,
      r.registrado_por
  ),
  inserted AS (
    INSERT INTO public.cancelaciones (
      reserva_id,
      motivo,
      horas_anticipacion,
      politica_aplicada,
      monto_reembolso,
      gestionado_por
    )
    SELECT
      u.id,
      'Cancelación automática por vencimiento de espera de comprobante.',
      GREATEST(
        0,
        FLOOR(
          EXTRACT(
            EPOCH FROM (
              COALESCE(u.checkin_programado_at::timestamp, u.fecha_ingreso::timestamp) - now()::timestamp
            )
          ) / 3600
        )
      )::smallint,
      'sin_reembolso',
      0,
      COALESCE(
        (SELECT valid_user.id FROM public.usuarios valid_user WHERE valid_user.id = u.registrado_por),
        (SELECT staff_user.id FROM public.usuarios staff_user WHERE staff_user.rol IN ('admin', 'recepcionista') ORDER BY staff_user.created_at NULLS LAST LIMIT 1),
        (SELECT any_user.id FROM public.usuarios any_user ORDER BY any_user.created_at NULLS LAST LIMIT 1)
      )
    FROM updated u
    ON CONFLICT (reserva_id) DO NOTHING
    RETURNING cancelaciones.reserva_id
  )
  SELECT
    u.id,
    u.codigo_reserva,
    u.huesped_id
  FROM updated u
  WHERE EXISTS (
    SELECT 1
    FROM inserted i
    WHERE i.reserva_id = u.id
  );
$$;

REVOKE ALL ON FUNCTION public.auto_cancel_expired_pending_reservations(
  integer,
  timestamp without time zone,
  uuid
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auto_cancel_expired_pending_reservations(
  integer,
  timestamp without time zone,
  uuid
) TO service_role;
