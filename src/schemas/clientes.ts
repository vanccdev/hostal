import { z } from "zod";

export const clienteStaffSchema = z.object({
  nombreCompleto: z.string().min(2, "Ingresa el nombre completo"),
  email: z.email("Email inválido").trim().toLowerCase(),
  telefono: z.string().min(6, "El teléfono es obligatorio"),
  tipoDocumento: z.enum(["CI", "Pasaporte", "DNI", "RUC", "Otro"], "Selecciona el tipo de documento"),
  numeroDocumento: z.string().min(2, "Ingresa el número de documento"),
  pais: z.string().optional(),
});

export const resetClientPasswordSchema = z.object({
  userId: z.uuid("Usuario inválido"),
});

export type ClienteStaffInput = z.infer<typeof clienteStaffSchema>;
export type ResetClientPasswordInput = z.infer<typeof resetClientPasswordSchema>;
