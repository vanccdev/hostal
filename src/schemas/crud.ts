import { z } from "zod";

export const habitacionSchema = z.object({
  id: z.uuid().optional(),
  nombre: z.string().optional(),
  numero: z.string().min(1, "Ingresa un número o nombre"),
  tipo: z.string().optional(),
  capacidad: z.coerce.number().int().positive("Capacidad inválida"),
  precioBase: z.coerce.number().nonnegative("Precio inválido"),
  estado: z.string().default("disponible"),
  descripcion: z.string().optional(),
  activa: z.coerce.boolean().default(true),
});

export const huespedSchema = z.object({
  id: z.uuid().optional(),
  nombreCompleto: z.string().min(2, "Ingresa el nombre completo"),
  email: z.email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  tipoDocumento: z.string().optional(),
  numeroDocumento: z.string().optional(),
  pais: z.string().optional(),
});

export const tarifaSchema = z.object({
  id: z.uuid().optional(),
  nombre: z.string().min(2, "Ingresa el nombre"),
  precioNoche: z.coerce.number().nonnegative("Precio inválido"),
  activa: z.coerce.boolean().default(true),
});

export type HabitacionInput = z.infer<typeof habitacionSchema>;
export type HuespedInput = z.infer<typeof huespedSchema>;
export type TarifaInput = z.infer<typeof tarifaSchema>;

