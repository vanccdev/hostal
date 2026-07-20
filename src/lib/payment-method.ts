import type { MetodoPago } from "@/types/database";

export const paymentMethodLabel = (method: MetodoPago | string | null | undefined) => {
  switch (method) {
    case "qr":
    case "qr_otro":
    case "qr_simple_tigo":
    case "qr_simple_bnb":
      return "QR";
    case "tarjeta":
      return "Tarjeta";
    case "efectivo":
      return "Efectivo";
    default:
      return "Sin método";
  }
};
