"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertReservationDates, assertRoomIsAvailable, calculateReservationPrice } from "@/lib/db/reservas";
import { writeAuditLog } from "@/lib/db/audit";
import { localISODate } from "@/lib/datetime";
import { emitEvent } from "@/lib/notifications/emit-event";
import { isManagementRole } from "@/lib/permissions";
import { getStaySettings, scheduledStayInterval } from "@/lib/stay-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { reservaClienteSchema, reservaStaffSchema } from "@/schemas/reservas";
import type { ActionState } from "@/app/actions/types";
import { formValue, validationErrors } from "@/app/actions/helpers";

const reservationCode = () => {
  const date = localISODate().slice(2).replace(/-/g, "");
  const suffix = crypto.randomUUID().slice(0, 5).toUpperCase();
  return `R${date}${suffix}`;
};

export const createClientReservation = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || currentUser.profile.rol !== "cliente") {
    return { ok: false, message: "Solo clientes pueden crear reservas propias." };
  }

  if (currentUser.profile.must_change_password) {
    redirect("/app/cambiar-contrasena");
  }

  const parsed = reservaClienteSchema.safeParse({
    habitacionId: formValue(formData, "habitacionId"),
    tarifaId: formValue(formData, "tarifaId"),
    fechaIngreso: formValue(formData, "fechaIngreso"),
    fechaSalida: formValue(formData, "fechaSalida"),
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const admin = createSupabaseAdminClient();
  const { data: guest, error: guestError } = await admin
    .from("huespedes")
    .select("id")
    .eq("usuario_id", currentUser.authUserId)
    .maybeSingle();

  if (guestError || !guest) {
    return { ok: false, message: guestError?.message ?? "No existe huésped asociado a tu usuario." };
  }

  let createdReservationId = "";

  try {
    const nights = assertReservationDates(parsed.data.fechaIngreso, parsed.data.fechaSalida);
    const staySettings = await getStaySettings(admin);
    const stayInterval = scheduledStayInterval(parsed.data.fechaIngreso, parsed.data.fechaSalida, staySettings);
    await assertRoomIsAvailable(
      admin,
      parsed.data.habitacionId,
      parsed.data.fechaIngreso,
      parsed.data.fechaSalida,
      staySettings,
    );
    const total = await calculateReservationPrice(admin, parsed.data.tarifaId, parsed.data.habitacionId, nights);

    const { data: reservation, error } = await admin
      .from("reservas")
      .insert({
        codigo_reserva: reservationCode(),
        huesped_id: guest.id,
        habitacion_id: parsed.data.habitacionId,
        tarifa_id: parsed.data.tarifaId,
        fecha_ingreso: parsed.data.fechaIngreso,
        fecha_salida: parsed.data.fechaSalida,
        checkin_programado_at: stayInterval.checkinAt,
        checkout_programado_at: stayInterval.checkoutAt,
        num_noches: nights,
        num_huespedes: 1,
        canal_origen: "web",
        precio_total: total,
        estado: "pendiente_pago",
        registrado_por: currentUser.authUserId,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, message: error.message };
    }

    await writeAuditLog(admin, {
      actor_id: currentUser.authUserId,
      accion: "reserva.creada",
      entidad: "reservas",
      entidad_id: reservation.id,
      metadata: { origen: "cliente", precio_total: total },
    });

    await emitEvent(admin, {
      event: "reserva.creada",
      title: "Reserva creada",
      message: "Tu reserva fue registrada y está pendiente de confirmación.",
      userId: currentUser.authUserId,
      actorId: currentUser.authUserId,
      entity: "reservas",
      entityId: reservation.id,
      payload: { reserva_id: reservation.id, origen: "cliente", precio_total: total },
    });

    createdReservationId = reservation.id;
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo crear la reserva." };
  }

  revalidatePath("/app/reservas");
  redirect(`/app/reservas/${createdReservationId}`);
};

export const createStaffReservation = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para crear reservas de clientes." };
  }

  const parsed = reservaStaffSchema.safeParse({
    huespedId: formValue(formData, "huespedId"),
    habitacionId: formValue(formData, "habitacionId"),
    tarifaId: formValue(formData, "tarifaId"),
    fechaIngreso: formValue(formData, "fechaIngreso"),
    fechaSalida: formValue(formData, "fechaSalida"),
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const admin = createSupabaseAdminClient();

  try {
    const nights = assertReservationDates(parsed.data.fechaIngreso, parsed.data.fechaSalida);
    const staySettings = await getStaySettings(admin);
    const stayInterval = scheduledStayInterval(parsed.data.fechaIngreso, parsed.data.fechaSalida, staySettings);
    await assertRoomIsAvailable(
      admin,
      parsed.data.habitacionId,
      parsed.data.fechaIngreso,
      parsed.data.fechaSalida,
      staySettings,
    );
    const total = await calculateReservationPrice(admin, parsed.data.tarifaId, parsed.data.habitacionId, nights);

    const { data: reservation, error } = await admin
      .from("reservas")
      .insert({
        codigo_reserva: reservationCode(),
        huesped_id: parsed.data.huespedId,
        habitacion_id: parsed.data.habitacionId,
        tarifa_id: parsed.data.tarifaId,
        fecha_ingreso: parsed.data.fechaIngreso,
        fecha_salida: parsed.data.fechaSalida,
        checkin_programado_at: stayInterval.checkinAt,
        checkout_programado_at: stayInterval.checkoutAt,
        num_noches: nights,
        num_huespedes: 1,
        canal_origen: "recepcion",
        precio_total: total,
        estado: "pendiente_pago",
        registrado_por: currentUser.authUserId,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, message: error.message };
    }

    await writeAuditLog(admin, {
      actor_id: currentUser.authUserId,
      accion: "reserva.creada",
      entidad: "reservas",
      entidad_id: reservation.id,
      metadata: { origen: "staff", precio_total: total },
    });

    await emitEvent(admin, {
      event: "reserva.creada",
      title: "Reserva creada por personal",
      message: "Se creó una reserva desde el panel administrativo.",
      actorId: currentUser.authUserId,
      entity: "reservas",
      entityId: reservation.id,
      payload: { reserva_id: reservation.id, origen: "staff", precio_total: total },
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo crear la reserva." };
  }

  revalidatePath("/admin/reservas");
  redirect("/admin/reservas");
};
