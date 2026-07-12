import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchWebhook, type DomainEvent } from "@/lib/webhooks/dispatch";
import type { Database, Json, NotificacionDestinatarioRol, NotificacionTipo } from "@/types/database";

type EmitEventInput = {
  event: DomainEvent;
  title: string;
  message: string;
  userId?: string | null;
  payload?: Json;
};

const notificationByEvent: Partial<
  Record<DomainEvent, { tipo: NotificacionTipo; destinatario_rol: NotificacionDestinatarioRol }>
> = {
  "reserva.creada": { tipo: "pago_pendiente", destinatario_rol: "recepcionista" },
  "pago.registrado": { tipo: "pago_pendiente", destinatario_rol: "recepcionista" },
  "habitacion.estado_actualizado": { tipo: "mantenimiento", destinatario_rol: "recepcionista" },
};

const reservaIdFromPayload = (payload: Json) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const value = payload.reserva_id;
  return typeof value === "string" ? value : null;
};

export const emitEvent = async (supabase: SupabaseClient<Database>, input: EmitEventInput) => {
  const metadata = input.payload ?? null;
  const notification = notificationByEvent[input.event];

  if (notification) {
    const { error } = await supabase.from("notificaciones").insert({
      tipo: notification.tipo,
      reserva_id: reservaIdFromPayload(metadata),
      mensaje: input.message,
      destinatario_rol: notification.destinatario_rol,
      leida: false,
    });

    if (error) {
      console.error("notification insert failed", error.message);
    }
  }

  await dispatchWebhook(input.event, metadata);
};
