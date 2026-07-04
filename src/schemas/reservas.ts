import { z } from "zod";

export const reservaClienteSchema = z.object({
  habitacionId: z.uuid("Habitación inválida"),
  tarifaId: z.uuid("Tarifa inválida").optional().or(z.literal("")),
  fechaIngreso: z.iso.date("Fecha de ingreso inválida"),
  fechaSalida: z.iso.date("Fecha de salida inválida"),
});

export const reservaStaffSchema = reservaClienteSchema.extend({
  huespedId: z.uuid("Huésped inválido"),
});

export type ReservaClienteInput = z.infer<typeof reservaClienteSchema>;
export type ReservaStaffInput = z.infer<typeof reservaStaffSchema>;

