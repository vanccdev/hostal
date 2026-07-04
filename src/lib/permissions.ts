import type { UserRole } from "@/types/database";

export const staffRoles = ["admin", "recepcionista", "limpieza"] as const;
export const managementRoles = ["admin", "recepcionista"] as const;

export type AdminModule =
  | "dashboard"
  | "habitaciones"
  | "huespedes"
  | "clientes"
  | "reservas"
  | "tarifas"
  | "transacciones"
  | "cancelaciones"
  | "comprobantes"
  | "bloqueos"
  | "estado-habitaciones"
  | "notificaciones"
  | "configuracion"
  | "auditoria"
  | "usuarios";

const permissions: Record<UserRole, AdminModule[]> = {
  admin: [
    "dashboard",
    "habitaciones",
    "huespedes",
    "clientes",
    "reservas",
    "tarifas",
    "transacciones",
    "cancelaciones",
    "comprobantes",
    "bloqueos",
    "estado-habitaciones",
    "notificaciones",
    "configuracion",
    "auditoria",
    "usuarios",
  ],
  recepcionista: [
    "dashboard",
    "habitaciones",
    "huespedes",
    "clientes",
    "reservas",
    "transacciones",
    "cancelaciones",
    "comprobantes",
    "bloqueos",
    "estado-habitaciones",
    "notificaciones",
    "usuarios",
  ],
  limpieza: ["dashboard", "habitaciones", "estado-habitaciones"],
  cliente: [],
};

export const canAccessAdminModule = (role: UserRole, module: AdminModule) =>
  permissions[role].includes(module);

export const isStaffRole = (role: UserRole) => staffRoles.includes(role as (typeof staffRoles)[number]);

export const isManagementRole = (role: UserRole) =>
  managementRoles.includes(role as (typeof managementRoles)[number]);

