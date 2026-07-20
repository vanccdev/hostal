import { z } from "zod";

export const staffUserSchema = z
  .object({
    nombreCompleto: z.string().min(2, "Ingresa el nombre completo"),
    email: z.email("Email inválido").trim().toLowerCase(),
    telefono: z.string().optional(),
    rol: z.enum(["admin", "recepcionista", "limpieza"], "Selecciona el rol"),
    password: z.string().min(8, "La contraseña temporal debe tener al menos 8 caracteres"),
    passwordConfirm: z.string().min(8, "Confirma la contraseña temporal"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirm"],
  });

export type StaffUserInput = z.infer<typeof staffUserSchema>;
export type StaffUserFormValues = Omit<StaffUserInput, "password" | "passwordConfirm">;
