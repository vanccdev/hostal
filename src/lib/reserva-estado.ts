import type { ReservaEstado } from "@/types/database";

export const reservaEstadoLabels: Record<ReservaEstado, string> = {
  pendiente_pago: "Pendiente de pago",
  confirmada: "Confirmada",
  checkin: "Check-in",
  checkout: "Check-out",
  cancelada: "Cancelada",
  no_show: "No se presentó",
};

export const formatReservaEstado = (estado: string | null | undefined) => {
  if (!estado) {
    return "-";
  }

  return reservaEstadoLabels[estado as ReservaEstado] ?? estado;
};
