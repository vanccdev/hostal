import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { localISODateTime } from "@/lib/datetime";
import { emitEvent } from "@/lib/notifications/emit-event";
import { getStaySettings } from "@/lib/stay-settings";
import type { Database } from "@/types/database";

type AutoCancelResult = {
  checked: number;
  canceled: number;
  disabled: boolean;
  timeoutMinutes: number;
  cutoff?: string;
};

type AutoCancelOptions = {
  reservationId?: string;
};

export const cancelExpiredPendingReservations = async (
  supabase: SupabaseClient<Database>,
  options: AutoCancelOptions = {},
): Promise<AutoCancelResult> => {
  const settings = await getStaySettings(supabase);
  const timeoutMinutes = settings.paymentProofTimeoutMinutes;

  if (timeoutMinutes <= 0) {
    return { checked: 0, canceled: 0, disabled: true, timeoutMinutes };
  }

  const cutoff = localISODateTime(new Date(Date.now() - timeoutMinutes * 60_000));
  let reservationsQuery = supabase
    .from("reservas")
    .select("id")
    .eq("estado", "pendiente_pago")
    .lte("created_at", cutoff)
    .limit(200);

  if (options.reservationId) {
    reservationsQuery = reservationsQuery.eq("id", options.reservationId);
  }

  const { data: pendingReservations, error: reservationsError } = await reservationsQuery;

  if (reservationsError) {
    throw new Error(reservationsError.message);
  }

  const checked = pendingReservations?.length ?? 0;

  if (checked === 0) {
    return { checked: 0, canceled: 0, disabled: false, timeoutMinutes, cutoff };
  }

  const { data: canceledReservations, error: cancelError } = await supabase.rpc(
    "auto_cancel_expired_pending_reservations",
    {
      p_timeout_minutes: timeoutMinutes,
      p_cutoff: cutoff,
      p_reservation_id: options.reservationId ?? null,
    },
  );

  if (cancelError) {
    throw new Error(cancelError.message);
  }

  if ((canceledReservations ?? []).length > 0) {
    const { data: guests } = await supabase
      .from("huespedes")
      .select("id,usuario_id")
      .in("id", (canceledReservations ?? []).map((reservation) => reservation.huesped_id));
    const userIdByGuestId = new Map((guests ?? []).map((guest) => [guest.id, guest.usuario_id]));

    await Promise.all(
      (canceledReservations ?? []).map((reservation) =>
        emitEvent(supabase, {
          event: "reserva.cancelada",
          title: "Reserva cancelada automáticamente",
          message: `La reserva ${reservation.codigo_reserva} fue cancelada por falta de comprobante dentro del tiempo configurado.`,
          userId: userIdByGuestId.get(reservation.huesped_id) ?? null,
          entity: "reservas",
          entityId: reservation.reserva_id,
          payload: {
            reserva_id: reservation.reserva_id,
            codigo_reserva: reservation.codigo_reserva,
            motivo: "comprobante_vencido",
          },
        }),
      ),
    );
  }

  return {
    checked,
    canceled: canceledReservations?.length ?? 0,
    disabled: false,
    timeoutMinutes,
    cutoff,
  };
};
