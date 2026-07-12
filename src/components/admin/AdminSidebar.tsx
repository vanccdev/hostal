"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const visibleItems = items.filter((item) => canAccessAdminModule(role, item.module));

  const renderNav = (closeOnSelect: boolean) => (
    <nav aria-label="Administración" className="grid gap-1">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeOnSelect ? () => setOpen(false) : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-[#fff1f3] text-[#ff385c] dark:bg-[#3a1f27] dark:text-[#ff8ca1]"
                : "text-[#717171] hover:bg-[#f7f7f7] hover:text-[#222222] dark:text-[#b0b0b0] dark:hover:bg-[#2b2b2b] dark:hover:text-zinc-100"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
      <form action={logoutAction} className="mt-3 border-t border-[#ebebeb] pt-3 dark:border-[#333333]">
        <button
          type="submit"
          className="flex min-h-11 w-full items-center gap-3 rounded-full px-4 py-2 text-left text-sm font-semibold text-[#717171] transition-colors hover:bg-[#f7f7f7] hover:text-[#222222] dark:text-[#b0b0b0] dark:hover:bg-[#2b2b2b] dark:hover:text-zinc-100"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Salir</span>
        </button>
      </form>
    </nav>
  );

  return (
    <aside className="border-b border-[#dddddd] bg-white dark:border-[#3a3a3a] dark:bg-[#1f1f1f] md:min-h-screen md:border-b-0 md:border-r">
      <div className="md:hidden">
        <button
          type="button"
          className="flex h-16 w-full items-center justify-between gap-3 px-4 text-left"
          onClick={() => setOpen((currentOpen) => !currentOpen)}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
        >
          <div className="flex items-center gap-3">
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#153f2a]">
              <Image src="/icono.jpg" alt="Hostal Plaza Camargo" fill sizes="40px" className="object-cover" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#ff385c]">Hostal Admin</p>
              <p className="text-xs font-medium text-[#717171] dark:text-[#b0b0b0]">{role}</p>
            </div>
          </div>
          {open ? (
            <span className="text-sm font-semibold text-[#222222] dark:text-zinc-100">Cerrar</span>
          ) : (
            <Menu className="h-5 w-5 text-[#222222] dark:text-zinc-100" aria-hidden="true" />
          )}
        </button>
        {open ? (
          <div id="admin-mobile-nav" className="max-h-[calc(100vh-3.5rem)] overflow-y-auto px-3 pb-4">
            {renderNav(true)}
          </div>
        ) : null}
      </div>

      <div className="sticky top-0 hidden max-h-screen overflow-y-auto md:block">
        <div className="flex items-center gap-3 px-6 py-6">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#153f2a]">
            <Image src="/icono.jpg" alt="Hostal Plaza Camargo" fill sizes="44px" className="object-cover" />
          </span>
          <div>
            <p className="text-lg font-bold text-[#ff385c]">Hostal Admin</p>
            <p className="text-xs font-semibold uppercase text-[#717171] dark:text-[#b0b0b0]">{role}</p>
          </div>
        </div>
        <div className="px-4 pb-6">{renderNav(false)}</div>
      </div>
    </aside>
  );
};
