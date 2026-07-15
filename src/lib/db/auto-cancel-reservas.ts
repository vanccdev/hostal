import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getStaySettings } from "@/lib/stay-settings";
import type { Database } from "@/types/database";

type AutoCancelResult = {
  checked: number;
  canceled: number;
  disabled: boolean;
  timeoutMinutes: number;
  cutoff?: string;
};

const autoCancelNote = (cutoff: string, timeoutMinutes: number) =>
  `Cancelada automáticamente por falta de comprobante después de ${timeoutMinutes} minutos. Corte: ${cutoff}.`;

export const cancelExpiredPendingReservations = async (
  supabase: SupabaseClient<Database>,
): Promise<AutoCancelResult> => {
  const settings = await getStaySettings(supabase);
  const timeoutMinutes = settings.paymentProofTimeoutMinutes;

  if (timeoutMinutes <= 0) {
    return { checked: 0, canceled: 0, disabled: true, timeoutMinutes };
  }

  const cutoffDate = new Date(Date.now() - timeoutMinutes * 60_000);
  const cutoff = cutoffDate.toISOString();
  const { data: pendingReservations, error: reservationsError } = await supabase
    .from("reservas")
    .select("id,notas_internas")
    .eq("estado", "pendiente_pago")
    .lte("created_at", cutoff)
    .limit(200);

  if (reservationsError) {
    throw new Error(reservationsError.message);
  }

  const reservationIds = (pendingReservations ?? []).map((reservation) => reservation.id);

  if (reservationIds.length === 0) {
    return { checked: 0, canceled: 0, disabled: false, timeoutMinutes, cutoff };
  }

  const [{ data: comprobantes, error: comprobantesError }, { data: transacciones, error: transaccionesError }] =
    await Promise.all([
      supabase.from("comprobantes").select("reserva_id").in("reserva_id", reservationIds),
      supabase
        .from("transacciones")
        .select("reserva_id,comprobante_url,estado_verificacion")
        .in("reserva_id", reservationIds),
    ]);

  if (comprobantesError) {
    throw new Error(comprobantesError.message);
  }

  if (transaccionesError) {
    throw new Error(transaccionesError.message);
  }

  const reservationIdsWithProof = new Set<string>();

  for (const comprobante of comprobantes ?? []) {
    reservationIdsWithProof.add(comprobante.reserva_id);
  }

  for (const transaccion of transacciones ?? []) {
    if (transaccion.comprobante_url || transaccion.estado_verificacion === "aprobada") {
      reservationIdsWithProof.add(transaccion.reserva_id);
    }
  }

  const expiredReservations = (pendingReservations ?? []).filter(
    (reservation) => !reservationIdsWithProof.has(reservation.id),
  );

  const updateResults = await Promise.all(
    expiredReservations.map((reservation) => {
      const note = autoCancelNote(cutoff, timeoutMinutes);
      const notasInternas = reservation.notas_internas ? `${reservation.notas_internas}\n${note}` : note;

      return supabase
        .from("reservas")
        .update({
          estado: "cancelada",
          notas_internas: notasInternas,
        })
        .eq("id", reservation.id)
        .eq("estado", "pendiente_pago");
    }),
  );
  const updateError = updateResults.find((result) => result.error)?.error;

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    checked: reservationIds.length,
    canceled: expiredReservations.length,
    disabled: false,
    timeoutMinutes,
    cutoff,
  };
};
