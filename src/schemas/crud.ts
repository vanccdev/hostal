import { z } from "zod";

const tipoDocumentoSchema = z.enum(["CI", "Pasaporte", "DNI", "RUC", "Otro"]).optional().or(z.literal(""));

export const habitacionSchema = z.object({
  id: z.uuid().optional(),
  tarifaId: z.uuid("Selecciona una tarifa"),
  numero: z.string().min(1, "Ingresa un número o nombre"),
  tipo: z.enum(["individual", "matrimonial", "individual doble", "triple", "familiar"]),
  piso: z.coerce.number().int().positive("Piso inválido"),
  capacidadMax: z.coerce.number().int().positive("Capacidad inválida"),
  descripcion: z.string().optional(),
  activa: z.coerce.boolean().default(true),
});

export const huespedSchema = z.object({
  id: z.uuid().optional(),
  nombreCompleto: z.string().min(2, "Ingresa el nombre completo"),
  email: z.email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  tipoDocumento: tipoDocumentoSchema,
  numeroDocumento: z.string().optional(),
  pais: z.string().optional(),
});

export const tarifaSchema = z.object({
  id: z.uuid().optional(),
  habitacionTipo: z.enum(["individual", "matrimonial", "individual doble", "triple", "familiar"]),
  temporada: z.enum(["alta", "baja", "normal"]),
  precioNoche: z.coerce.number().nonnegative("Precio inválido"),
  peso: z.coerce.number().int().min(0, "Peso inválido").max(3, "Peso inválido").default(0),
  vigenteDesde: z.iso.date("Fecha inválida"),
  vigenteHasta: z.iso.date("Fecha inválida").optional().or(z.literal("")),
  activa: z.coerce.boolean().default(true),
});

export type HabitacionInput = z.infer<typeof habitacionSchema>;
export type HuespedInput = z.infer<typeof huespedSchema>;
export type TarifaInput = z.infer<typeof tarifaSchema>;
