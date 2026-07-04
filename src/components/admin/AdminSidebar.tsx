"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Banknote,
  BedDouble,
  Bell,
  CalendarDays,
  ClipboardList,
  FileCheck,
  HardDriveDownload,
  History,
  Home,
  LockKeyhole,
  LogOut,
  Menu,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
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
  { href: "/admin/backups", label: "Backups", module: "backups", icon: HardDriveDownload },
  { href: "/admin/usuarios", label: "Usuarios", module: "usuarios", icon: Users },
];

type AdminSidebarProps = {
  role: UserRole;
};

export const AdminSidebar = ({ role }: AdminSidebarProps) => {
  const [open, setOpen] = useState(false);
  const visibleItems = items.filter((item) => canAccessAdminModule(role, item.module));

  const renderNav = (closeOnSelect: boolean) => (
    <nav aria-label="Administración" className="grid gap-1">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeOnSelect ? () => setOpen(false) : undefined}
            className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
      <form action={logoutAction} className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
        <button
          type="submit"
          className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Salir</span>
        </button>
      </form>
    </nav>
  );

  return (
    <aside className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:min-h-screen md:border-b-0 md:border-r">
      <div className="md:hidden">
        <button
          type="button"
          className="flex h-14 w-full items-center justify-between gap-3 px-4 text-left"
          onClick={() => setOpen((currentOpen) => !currentOpen)}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
        >
          <div>
            <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Hostal Admin</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{role}</p>
          </div>
          {open ? (
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Cerrar</span>
          ) : (
            <Menu className="h-5 w-5 text-zinc-700 dark:text-zinc-300" aria-hidden="true" />
          )}
        </button>
        {open ? (
          <div id="admin-mobile-nav" className="max-h-[calc(100vh-3.5rem)] overflow-y-auto px-3 pb-4">
            {renderNav(true)}
          </div>
        ) : null}
      </div>

      <div className="sticky top-0 hidden max-h-screen overflow-y-auto md:block">
        <div className="px-5 py-4">
          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Hostal Admin</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{role}</p>
        </div>
        <div className="px-3 pb-6">{renderNav(false)}</div>
      </div>
    </aside>
  );
};
