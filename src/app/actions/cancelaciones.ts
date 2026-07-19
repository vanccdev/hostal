"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { calculateCancellationPolicy } from "@/lib/cancellation-policy";
import { writeAuditLog } from "@/lib/db/audit";
import { getGuestForUser } from "@/lib/db/current-guest";
import { emitEvent } from "@/lib/notifications/emit-event";
import { isManagementRole } from "@/lib/permissions";
import { getStaySettings } from "@/lib/stay-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/app/actions/types";

const cancelableStates = new Set(["pendiente_pago", "confirmada", "checkin"]);
const clientCancelableStates = new Set(["pendiente_pago", "confirmada"]);

const formString = (formData: FormData, key: string) => {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
};

export const cancelReservationAction = async (_state: ActionState, formData: FormData): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para cancelar reservas." };
  }

  const reservaId = formString(formData, "reservaId");
  const motivo = formString(formData, "motivo");

  if (!reservaId) {
    return { ok: false, errors: { reservaId: ["Reserva inválida."] } };
  }

  if (motivo.length < 5) {
    return { ok: false, errors: { motivo: ["Describe el motivo de cancelación."] } };
  }

  const supabase = createSupabaseAdminClient();
  const { data: reserva, error: reservaError } = await supabase
    .from("reservas")
    .select("id,codigo_reserva,huesped_id,estado,fecha_ingreso,checkin_programado_at,precio_total,notas_internas")
    .eq("id", reservaId)
    .maybeSingle();

  if (reservaError || !reserva) {
    return { ok: false, message: reservaError?.message ?? "No se encontró la reserva." };
  }

  if (!cancelableStates.has(reserva.estado)) {
    return { ok: false, message: "Esta reserva ya no puede cancelarse desde este flujo." };
  }

  const { data: existingCancellation, error: existingCancellationError } = await supabase
    .from("cancelaciones")
    .select("id")
    .eq("reserva_id", reserva.id)
    .maybeSingle();

  if (existingCancellationError) {
    return { ok: false, message: existingCancellationError.message };
  }

  if (existingCancellation) {
    return { ok: false, message: "Esta reserva ya tiene una cancelación registrada." };
  }

  const { data: approvedPayments, error: paymentsError } = await supabase
    .from("transacciones")
    .select("monto")
    .eq("reserva_id", reserva.id)
    .eq("tipo", "pago")
    .eq("estado_verificacion", "aprobada");

  if (paymentsError) {
    return { ok: false, message: paymentsError.message };
  }

  const paidAmount = (approvedPayments ?? []).reduce((total, payment) => total + Number(payment.monto), 0);
  const settings = await getStaySettings(supabase);
  const policy = calculateCancellationPolicy({
    paidAmount,
    checkinAt: reserva.checkin_programado_at,
    fallbackDate: reserva.fecha_ingreso,
    settings,
  });
  const note = [
    `Cancelada manualmente por ${currentUser.profile.nombre}.`,
    `Motivo: ${motivo}`,
    `Pagado aprobado: ${paidAmount.toFixed(2)}.`,
    `Retención aplicada: ${settings.cancellationRetentionPercent}%.`,
    `Monto final hostal: ${policy.retainedAmount.toFixed(2)}.`,
  ].join(" ");

  const motivoAjuste = `Cancelación: monto final hostal ${policy.retainedAmount.toFixed(2)} con retención configurada de ${settings.cancellationRetentionPercent}%.`;
  const { error: cancellationError } = await supabase.rpc("cancel_reservation_with_accounting", {
    p_reserva_id: reserva.id,
    p_motivo: motivo,
    p_horas_anticipacion: policy.hoursBeforeStay,
    p_politica_aplicada: policy.policy,
    p_monto_pagado_aprobado: paidAmount,
    p_retencion_porcentaje_aplicado: settings.cancellationRetentionPercent,
    p_monto_reembolso: policy.refundAmount,
    p_monto_retenido: policy.retainedAmount,
    p_gestionado_por: currentUser.authUserId,
    p_motivo_ajuste: motivoAjuste,
    p_nota: note,
  });

  if (cancellationError) {
    return { ok: false, message: cancellationError.message };
  }

  await writeAuditLog(supabase, {
    actor_id: currentUser.authUserId,
    accion: "reserva.cancelada_manual",
    entidad: "reservas",
    entidad_id: reserva.id,
    metadata: {
      reserva_id: reserva.id,
      codigo_reserva: reserva.codigo_reserva,
      monto_pagado: paidAmount,
      retencion_porcentaje_aplicado: settings.cancellationRetentionPercent,
      monto_retenido: policy.retainedAmount,
      politica: policy.policy,
    },
  });

  await emitEvent(supabase, {
    event: "reserva.cancelada",
    title: "Reserva cancelada",
    message: `La reserva ${reserva.codigo_reserva} fue cancelada. Monto final hostal: ${policy.retainedAmount.toFixed(2)}.`,
    actorId: currentUser.authUserId,
    entity: "reservas",
    entityId: reserva.id,
    payload: {
      reserva_id: reserva.id,
      codigo_reserva: reserva.codigo_reserva,
      monto_pagado: paidAmount,
      retencion_porcentaje_aplicado: settings.cancellationRetentionPercent,
      monto_retenido: policy.retainedAmount,
      politica: policy.policy,
    },
  });

  revalidatePath("/admin/reserva-detalle");
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/cancelaciones");
  revalidatePath("/app/cancelaciones");
  revalidatePath("/app/reservas");
  revalidatePath("/app");

  return {
    ok: true,
    message: `Reserva cancelada. Monto final hostal: ${policy.retainedAmount.toFixed(2)}.`,
  };
};

export const cancelOwnReservationAction = async (_state: ActionState, formData: FormData): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || currentUser.profile.rol !== "cliente") {
    return { ok: false, message: "No tienes permiso para cancelar esta reserva." };
  }

  const reservaId = formString(formData, "reservaId");
  const motivo = formString(formData, "motivo");

  if (!reservaId) {
    return { ok: false, errors: { reservaId: ["Reserva inválida."] } };
  }

  if (motivo.length < 5) {
    return { ok: false, errors: { motivo: ["Describe el motivo de cancelación."] } };
  }

  const supabase = createSupabaseAdminClient();
  const guest = await getGuestForUser(currentUser.authUserId);

  if (!guest) {
    return { ok: false, message: "No se encontró tu ficha de huésped." };
  }

  const { data: reserva, error: reservaError } = await supabase
    .from("reservas")
    .select("id,codigo_reserva,huesped_id,estado,fecha_ingreso,checkin_programado_at,precio_total,notas_internas")
    .eq("id", reservaId)
    .eq("huesped_id", guest.id)
    .maybeSingle();

  if (reservaError || !reserva) {
    return { ok: false, message: reservaError?.message ?? "No se encontró la reserva." };
  }

  if (!clientCancelableStates.has(reserva.estado)) {
    return { ok: false, message: "Esta reserva ya no puede cancelarse desde tu cuenta." };
  }

  const { data: existingCancellation, error: existingCancellationError } = await supabase
    .from("cancelaciones")
    .select("id")
    .eq("reserva_id", reserva.id)
    .maybeSingle();

  if (existingCancellationError) {
    return { ok: false, message: existingCancellationError.message };
  }

  if (existingCancellation) {
    return { ok: false, message: "Esta reserva ya tiene una cancelación registrada." };
  }

  const { data: approvedPayments, error: paymentsError } = await supabase
    .from("transacciones")
    .select("monto")
    .eq("reserva_id", reserva.id)
    .eq("tipo", "pago")
    .eq("estado_verificacion", "aprobada");

  if (paymentsError) {
    return { ok: false, message: paymentsError.message };
  }

  const paidAmount = (approvedPayments ?? []).reduce((total, payment) => total + Number(payment.monto), 0);
  const settings = await getStaySettings(supabase);
  const policy = calculateCancellationPolicy({
    paidAmount,
    checkinAt: reserva.checkin_programado_at,
    fallbackDate: reserva.fecha_ingreso,
    settings,
  });
  const note = [
    `Cancelada por el huésped ${currentUser.profile.nombre}.`,
    `Motivo: ${motivo}`,
    `Pagado aprobado: ${paidAmount.toFixed(2)}.`,
    `Retención aplicada: ${settings.cancellationRetentionPercent}%.`,
    `Monto final hostal: ${policy.retainedAmount.toFixed(2)}.`,
  ].join(" ");
  const motivoAjuste = `Cancelación solicitada por huésped: monto final hostal ${policy.retainedAmount.toFixed(2)} con retención configurada de ${settings.cancellationRetentionPercent}%.`;
  const { error: cancellationError } = await supabase.rpc("cancel_reservation_with_accounting", {
    p_reserva_id: reserva.id,
    p_motivo: motivo,
    p_horas_anticipacion: policy.hoursBeforeStay,
    p_politica_aplicada: policy.policy,
    p_monto_pagado_aprobado: paidAmount,
    p_retencion_porcentaje_aplicado: settings.cancellationRetentionPercent,
    p_monto_reembolso: policy.refundAmount,
    p_monto_retenido: policy.retainedAmount,
    p_gestionado_por: currentUser.authUserId,
    p_motivo_ajuste: motivoAjuste,
    p_nota: note,
  });

  if (cancellationError) {
    return { ok: false, message: cancellationError.message };
  }

  await writeAuditLog(supabase, {
    actor_id: currentUser.authUserId,
    accion: "reserva.cancelada_cliente",
    entidad: "reservas",
    entidad_id: reserva.id,
    metadata: {
      reserva_id: reserva.id,
      codigo_reserva: reserva.codigo_reserva,
      monto_pagado: paidAmount,
      retencion_porcentaje_aplicado: settings.cancellationRetentionPercent,
      monto_retenido: policy.retainedAmount,
      politica: policy.policy,
    },
  });

  await emitEvent(supabase, {
    event: "reserva.cancelada",
    title: "Reserva cancelada por huésped",
    message: `La reserva ${reserva.codigo_reserva} fue cancelada por el huésped. Monto final hostal: ${policy.retainedAmount.toFixed(2)}.`,
    actorId: currentUser.authUserId,
    entity: "reservas",
    entityId: reserva.id,
    payload: {
      reserva_id: reserva.id,
      codigo_reserva: reserva.codigo_reserva,
      monto_pagado: paidAmount,
      retencion_porcentaje_aplicado: settings.cancellationRetentionPercent,
      monto_retenido: policy.retainedAmount,
      politica: policy.policy,
    },
  });

  revalidatePath("/admin/reserva-detalle");
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/cancelaciones");
  revalidatePath("/app/cancelaciones");
  revalidatePath("/app/reservas");
  revalidatePath(`/app/reservas/${reserva.id}`);
  revalidatePath("/app");

  return {
    ok: true,
    message: `Reserva cancelada. Monto final hostal: ${policy.retainedAmount.toFixed(2)}.`,
  };
};
