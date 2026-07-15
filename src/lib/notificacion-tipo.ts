import type { NotificacionTipo } from "@/types/database";

export const notificacionTipoLabels: Record<NotificacionTipo, string> = {
  overbooking: "Sobreventa",
  pago_pendiente: "Pago pendiente",
  checkin_hoy: "Check-in hoy",
  checkout_hoy: "Check-out hoy",
  mantenimiento: "Mantenimiento",
};

export const formatNotificacionTipo = (tipo: string | null | undefined) => {
  if (!tipo) {
    return "-";
  }

  return notificacionTipoLabels[tipo as NotificacionTipo] ?? tipo;
};
