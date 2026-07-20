import { z } from "zod";
import { calculateTurnoverMinutes } from "@/lib/stay-settings";

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
  id: z.uuid("Huésped inválido"),
  tipoDocumento: z.enum(["CI", "Pasaporte", "DNI", "RUC", "Otro"], "Selecciona el tipo de documento"),
  numeroDocumento: z.string().min(2, "Ingresa el número de documento"),
  fechaNacimiento: z.iso.date("Fecha de nacimiento inválida").optional().or(z.literal("")),
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

export const staySettingsSchema = z
  .object({
    checkinTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora de check-in inválida"),
    checkoutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora de check-out inválida"),
    paymentProofTimeoutMinutes: z.coerce
      .number()
      .int("Ingresa minutos completos")
      .min(0, "Usa 0 para desactivar o un tiempo válido")
      .max(10080, "El máximo es 10080 minutos"),
    cancellationRefundHours: z.coerce
      .number()
      .int("Ingresa horas completas")
      .min(0, "Usa 0 o una cantidad válida de horas")
      .max(8760, "El máximo es 8760 horas"),
    cancellationRetentionPercent: z.coerce
      .number()
      .int("Ingresa un porcentaje completo")
      .min(0, "El porcentaje mínimo es 0")
      .max(100, "El porcentaje máximo es 100"),
  })
  .refine((value) => calculateTurnoverMinutes(value.checkoutTime, value.checkinTime) >= 1, {
    path: ["checkinTime"],
    message: "El check-in debe ser posterior al check-out por al menos 1 minuto.",
  });

export const bloqueoSchema = z
  .object({
    scope: z.enum(["una", "varias", "todas"], "Selecciona el alcance del bloqueo"),
    habitacionIds: z.array(z.uuid("Habitación inválida")).default([]),
    fechaInicio: z.iso.date("Fecha de inicio inválida"),
    fechaFin: z.iso.date("Fecha final inválida"),
    motivo: z.string().min(4, "Describe el motivo del bloqueo"),
  })
  .refine((value) => value.fechaFin > value.fechaInicio, {
    path: ["fechaFin"],
    message: "La fecha final debe ser posterior al inicio.",
  })
  .refine((value) => value.scope === "todas" || value.habitacionIds.length > 0, {
    path: ["habitacionIds"],
    message: "Selecciona al menos una habitación.",
  })
  .refine((value) => value.scope !== "una" || value.habitacionIds.length === 1, {
    path: ["habitacionIds"],
    message: "Selecciona solo una habitación para este alcance.",
  });

export const estadoHabitacionSchema = z.object({
  habitacionId: z.uuid("Habitación inválida"),
  estado: z.enum(["disponible", "ocupada", "limpieza", "mantenimiento", "bloqueada"], "Selecciona un estado"),
  notas: z.string().max(400, "Usa 400 caracteres o menos").optional(),
});

export type HabitacionInput = z.infer<typeof habitacionSchema>;
export type HuespedInput = z.infer<typeof huespedSchema>;
export type TarifaInput = z.infer<typeof tarifaSchema>;
export type StaySettingsInput = z.infer<typeof staySettingsSchema>;
export type BloqueoInput = z.infer<typeof bloqueoSchema>;
export type EstadoHabitacionInput = z.infer<typeof estadoHabitacionSchema>;
