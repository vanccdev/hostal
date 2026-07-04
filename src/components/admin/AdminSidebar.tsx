import Link from "next/link";
import {
  Banknote,
  BedDouble,
  Bell,
  CalendarDays,
  ClipboardList,
  FileCheck,
  History,
  Home,
  LockKeyhole,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import { canAccessAdminModule, type AdminModule } from "@/lib/permissions";
import type { UserRole } from "@/types/database";

const items: { href: string; label: string; module: AdminModule; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/admin", label: "Panel", module: "dashboard", icon: Home },
  { href: "/admin/habitaciones", label: "Habitaciones", module: "habitaciones", icon: BedDouble },
  { href: "/admin/huespedes", label: "Huéspedes", module: "huespedes", icon: Users },
  { href: "/admin/clientes/nuevo", label: "Nuevo cliente", module: "clientes", icon: UserPlus },
  { href: "/admin/reservas", label: "Reservas", module: "reservas", icon: CalendarDays },
  { href: "/admin/tarifas", label: "Tarifas", module: "tarifas", icon: ClipboardList },
  { href: "/admin/transacciones", label: "Transacciones", module: "transacciones", icon: Banknote },
  { href: "/admin/comprobantes", label: "Comprobantes", module: "comprobantes", icon: FileCheck },
  { href: "/admin/cancelaciones", label: "Cancelaciones", module: "cancelaciones", icon: LockKeyhole },
  { href: "/admin/bloqueos", label: "Bloqueos", module: "bloqueos", icon: LockKeyhole },
  { href: "/admin/estado-habitaciones", label: "Estado", module: "estado-habitaciones", icon: BedDouble },
  { href: "/admin/notificaciones", label: "Notificaciones", module: "notificaciones", icon: Bell },
  { href: "/admin/configuracion", label: "Configuración", module: "configuracion", icon: Settings },
  { href: "/admin/auditoria", label: "Auditoría", module: "auditoria", icon: History },
  { href: "/admin/usuarios", label: "Usuarios", module: "usuarios", icon: Users },
];

type AdminSidebarProps = {
  role: UserRole;
};

export const AdminSidebar = ({ role }: AdminSidebarProps) => (
  <aside className="border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
    <div className="px-5 py-4">
      <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Hostal Admin</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{role}</p>
    </div>
    <nav aria-label="Administración" className="grid gap-1 px-3 pb-6">
      {items
        .filter((item) => canAccessAdminModule(role, item.module))
        .map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
    </nav>
  </aside>
);
