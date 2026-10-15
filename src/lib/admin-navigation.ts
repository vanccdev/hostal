import type { AdminModule } from "@/lib/permissions";

// Shared by the sidebar and tutorials so every menu page has a guide.
export const adminNavigation = [
  { href: "/admin", label: "Panel", module: "dashboard" },
  { href: "/admin/habitaciones", label: "Habitaciones", module: "habitaciones" },
  { href: "/admin/huespedes", label: "Huéspedes", module: "huespedes" },
  { href: "/admin/clientes/nuevo", label: "Nuevo cliente", module: "clientes" },
  { href: "/admin/reserva-detalle", label: "Reserva detalle", module: "reservas" },
  { href: "/admin/verificar-comprobantes", label: "Verificar pagos", module: "comprobantes" },
  { href: "/admin/qr", label: "QR de pago", module: "qr" },
  { href: "/admin/tarifas", label: "Tarifas", module: "tarifas" },
  { href: "/admin/transacciones", label: "Transacciones", module: "transacciones" },
  { href: "/admin/comprobantes", label: "Comprobantes", module: "comprobantes" },
  { href: "/admin/cancelaciones", label: "Cancelaciones", module: "cancelaciones" },
  { href: "/admin/bloqueos", label: "Bloqueos", module: "bloqueos" },
  { href: "/admin/notificaciones", label: "Notificaciones", module: "notificaciones" },
  { href: "/admin/configuracion", label: "Configuración", module: "configuracion" },
  { href: "/admin/auditoria", label: "Auditoría", module: "auditoria" },
  { href: "/admin/backups", label: "Backups", module: "backups" },
  { href: "/admin/usuarios", label: "Usuarios", module: "usuarios" },
] as const satisfies readonly { href: string; label: string; module: AdminModule }[];

export type AdminNavigationHref = (typeof adminNavigation)[number]["href"];
