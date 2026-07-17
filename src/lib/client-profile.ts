import type { Huesped } from "@/types/database";

export const pendingDocumentNumberForUser = (userId: string) => `pendiente-${userId}`;

export const isPendingDocumentNumber = (value: string | null | undefined) =>
  Boolean(value?.startsWith("pendiente-") || value?.startsWith("sd-"));

export const isClientProfileIncomplete = (
  guest: Pick<Huesped, "telefono" | "tipo_documento" | "numero_documento" | "pais_origen"> | null,
) => {
  if (!guest) {
    return true;
  }

  return !guest.telefono || !guest.tipo_documento || !guest.numero_documento || isPendingDocumentNumber(guest.numero_documento);
};

export const displayDocumentNumber = (value: string | null | undefined) =>
  isPendingDocumentNumber(value) ? "Pendiente" : value ?? "-";
