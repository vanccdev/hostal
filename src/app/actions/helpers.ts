import { z } from "zod";
import type { ActionState } from "@/app/actions/types";

type DbErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const duplicatedGuestDocumentMessage = "Ya existe un huésped registrado con ese número de documento.";

export const formValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" && value !== "__none" ? value : "";
};

export const validationErrors = (error: z.ZodError) => error.flatten().fieldErrors;

export const isGuestDocumentUniqueError = (error: DbErrorLike | null | undefined) => {
  const text = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`;

  return error?.code === "23505" && text.includes("huespedes_numero_documento_key");
};

export const duplicatedGuestDocumentState = <T = unknown>(): ActionState<T> => ({
  ok: false,
  errors: { numeroDocumento: [duplicatedGuestDocumentMessage] },
});
