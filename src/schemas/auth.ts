import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email inválido").trim().toLowerCase(),
  password: z.string().trim().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const signupSchema = z.object({
  nombre: z.string().min(2, "Ingresa tu nombre"),
  email: z.email("Email inválido").trim().toLowerCase(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  telefono: z.string().min(5, "Ingresa tu número de celular o teléfono"),
});

export const changePasswordSchema = z.object({
  password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

export const completeClientProfileSchema = z.object({
  nombre: z.string().min(2, "Ingresa tu nombre completo"),
  telefono: z.string().min(5, "Ingresa tu número de celular o teléfono"),
  tipoDocumento: z.enum(["CI", "Pasaporte", "DNI", "RUC", "Otro"], "Selecciona el tipo de documento"),
  numeroDocumento: z.string().min(2, "Ingresa tu número de documento"),
  fechaNacimiento: z.iso.date("Fecha de nacimiento inválida").optional().or(z.literal("")),
  pais: z.string().optional(),
  observaciones: z.string().optional(),
});

export const updateClientProfileSchema = completeClientProfileSchema.extend({
  email: z.email("Email inválido").trim().toLowerCase(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CompleteClientProfileInput = z.infer<typeof completeClientProfileSchema>;
export type UpdateClientProfileInput = z.infer<typeof updateClientProfileSchema>;
