import type { Huesped } from "@/types/database";

export const pendingDocumentNumberForUser = (userId: string) => `pend-${userId.replaceAll("-", "").slice(0, 25)}`;

export const isPendingDocumentNumber = (value: string | null | undefined) =>
  Boolean(value?.startsWith("pend-") || value?.startsWith("pendiente-") || value?.startsWith("sd-"));

export const isClientProfileIncomplete = (
  guest: Pick<Huesped, "tipo_documento" | "numero_documento" | "pais_origen"> | null,
  telefono: string | null,
) => {
  if (!guest) {
    return true;
  }

  return !telefono || !guest.tipo_documento || !guest.numero_documento || isPendingDocumentNumber(guest.numero_documento);
};

export const displayDocumentNumber = (value: string | null | undefined) =>
  isPendingDocumentNumber(value) ? "Pendiente" : value ?? "-";
