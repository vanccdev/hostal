import { serverEnv } from "@/lib/env";
import type { Json } from "@/types/database";

export type DomainEvent =
  | "reserva.creada"
  | "reserva.confirmada"
  | "reserva.cancelada"
  | "pago.registrado"
  | "pago.aprobado"
  | "pago.rechazado"
  | "habitacion.estado_actualizado"
  | "cliente.cuenta_creada_por_personal"
  | "cliente.password_restablecido";

const getWebhookUrl = (event: DomainEvent) => {
  if (event.startsWith("reserva.")) {
    return serverEnv.webhookReservasUrl();
  }

  if (event.startsWith("pago.")) {
    return serverEnv.webhookPagosUrl();
  }

  if (event.startsWith("cliente.")) {
    return serverEnv.webhookAuthEventsUrl();
  }

  return serverEnv.webhookReservasUrl();
};

export const dispatchWebhook = async (event: DomainEvent, payload: Json) => {
  const url = getWebhookUrl(event);

  if (!url) {
    return { ok: true, skipped: true };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        event,
        payload,
        occurred_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error("webhook failed", event, response.status, await response.text());
      return { ok: false, status: response.status };
    }

    return { ok: true, skipped: false };
  } catch (error) {
    console.error("webhook dispatch error", event, error);
    return { ok: false, status: 0 };
  }
};

