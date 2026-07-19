import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchWebhook, type DomainEvent } from "@/lib/webhooks/dispatch";
import type { Database, Json, NotificacionDestinatarioRol, NotificacionTipo } from "@/types/database";

type EmitEventInput = {
  event: DomainEvent;
  title: string;
  message: string;
  userId?: string | null;
  actorId?: string | null;
  entity?: string | null;
  entityId?: string | null;
  payload?: Json;
};

const notificationByEvent: Partial<
  Record<DomainEvent, { tipo: NotificacionTipo; destinatario_rol: NotificacionDestinatarioRol }>
> = {
  "cliente.cuenta_creada": { tipo: "cliente", destinatario_rol: "todos" },
  "cliente.perfil_actualizado": { tipo: "cliente", destinatario_rol: "todos" },
  "cliente.cuenta_creada_por_personal": { tipo: "cliente", destinatario_rol: "recepcionista" },
  "cliente.password_restablecido": { tipo: "seguridad", destinatario_rol: "admin" },
  "reserva.creada": { tipo: "reserva", destinatario_rol: "recepcionista" },
  "reserva.confirmada": { tipo: "reserva", destinatario_rol: "todos" },
  "reserva.cancelada": { tipo: "reserva", destinatario_rol: "todos" },
  "reserva.estado_actualizado": { tipo: "reserva", destinatario_rol: "todos" },
  "pago.registrado": { tipo: "pago", destinatario_rol: "recepcionista" },
  "pago.aprobado": { tipo: "pago", destinatario_rol: "todos" },
  "pago.rechazado": { tipo: "pago", destinatario_rol: "todos" },
  "habitacion.guardada": { tipo: "habitacion", destinatario_rol: "recepcionista" },
  "habitacion.imagen_eliminada": { tipo: "habitacion", destinatario_rol: "recepcionista" },
  "habitacion.estado_actualizado": { tipo: "habitacion", destinatario_rol: "recepcionista" },
  "huesped.actualizado": { tipo: "huesped", destinatario_rol: "recepcionista" },
  "tarifa.guardada": { tipo: "tarifa", destinatario_rol: "admin" },
  "sistema.configuracion_actualizada": { tipo: "sistema", destinatario_rol: "admin" },
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
      titulo: input.title,
      reserva_id: reservaIdFromPayload(metadata),
      usuario_id: input.userId ?? null,
      actor_id: input.actorId ?? null,
      entidad: input.entity ?? entityFromEvent(input.event),
      entidad_id: input.entityId ?? entityIdFromPayload(metadata),
      accion: input.event,
      metadata: metadata ?? {},
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

const entityFromEvent = (event: DomainEvent) => {
  if (event.startsWith("reserva.")) {
    return "reservas";
  }

  if (event.startsWith("pago.")) {
    return "transacciones";
  }

  if (event.startsWith("cliente.")) {
    return "usuarios";
  }

  if (event.startsWith("habitacion.")) {
    return "habitaciones";
  }

  if (event.startsWith("huesped.")) {
    return "huespedes";
  }

  if (event.startsWith("tarifa.")) {
    return "tarifas";
  }

  return "sistema";
};

const entityIdFromPayload = (payload: Json) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const directId = payload.id;
  if (typeof directId === "string") {
    return directId;
  }

  for (const key of ["reserva_id", "transaccion_id", "user_id", "habitacion_id", "huesped_id", "tarifa_id"]) {
    const value = payload[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return null;
};
