import { z } from "zod";

const tipoDocumentoSchema = z.enum(["CI", "Pasaporte", "DNI", "RUC", "Otro"]).optional().or(z.literal(""));

export const clienteStaffSchema = z.object({
  nombreCompleto: z.string().min(2, "Ingresa el nombre completo"),
  email: z.email("Email inválido").trim().toLowerCase(),
  telefono: z.string().min(6, "El teléfono es obligatorio"),
  tipoDocumento: tipoDocumentoSchema,
  numeroDocumento: z.string().optional(),
  pais: z.string().optional(),
});

export const resetClientPasswordSchema = z.object({
  userId: z.uuid("Usuario inválido"),
});

export type ClienteStaffInput = z.infer<typeof clienteStaffSchema>;
export type ResetClientPasswordInput = z.infer<typeof resetClientPasswordSchema>;
