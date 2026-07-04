import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email inválido").trim().toLowerCase(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const signupSchema = z.object({
  nombre: z.string().min(2, "Ingresa tu nombre"),
  email: z.email("Email inválido").trim().toLowerCase(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  telefono: z.string().optional(),
  documento: z.string().optional(),
});

export const changePasswordSchema = z.object({
  password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

