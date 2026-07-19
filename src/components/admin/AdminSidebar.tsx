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
  FileText,
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
import { PaymentVerificationNavBadge } from "@/components/admin/PaymentVerificationNavBadge";
import { canAccessAdminModule, type AdminModule } from "@/lib/permissions";
import type { UserRole } from "@/types/database";

const items: { href: string; label: string; module: AdminModule; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/admin", label: "Panel", module: "dashboard", icon: Home },
  { href: "/admin/habitaciones", label: "Habitaciones", module: "habitaciones", icon: BedDouble },
  { href: "/admin/huespedes", label: "Huéspedes", module: "huespedes", icon: Users },
  { href: "/admin/clientes/nuevo", label: "Nuevo cliente", module: "clientes", icon: UserPlus },
  { href: "/admin/reservas", label: "Reservas", module: "reservas", icon: CalendarDays },
  { href: "/admin/reserva-detalle", label: "Reserva detalle", module: "reservas", icon: FileText },
  { href: "/admin/verificar-comprobantes", label: "Verificar pagos", module: "comprobantes", icon: FileCheck },
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
                ? "bg-[#f4ecd8] text-[#c7a35a] dark:bg-[#2b2618] dark:text-[#e8d59a]"
                : "text-[#66736a] hover:bg-[#f6f1e6] hover:text-[#18221b] dark:text-[#b7c0b4] dark:hover:bg-[#223229] dark:hover:text-zinc-100"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.href === "/admin/verificar-comprobantes" ? (
              <PaymentVerificationNavBadge label={item.label} />
            ) : (
              <span className="truncate">{item.label}</span>
            )}
          </Link>
        );
      })}
      <form action={logoutAction} className="mt-3 border-t border-[#ece4d4] pt-3 dark:border-[#2a3b31]">
        <button
          type="submit"
          className="flex min-h-11 w-full items-center gap-3 rounded-full px-4 py-2 text-left text-sm font-semibold text-[#66736a] transition-colors hover:bg-[#f6f1e6] hover:text-[#18221b] dark:text-[#b7c0b4] dark:hover:bg-[#223229] dark:hover:text-zinc-100"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Salir</span>
        </button>
      </form>
    </nav>
  );

  return (
    <aside className="border-b border-[#d8d4c8] bg-white dark:border-[#314237] dark:bg-[#18251d] md:min-h-screen md:border-b-0 md:border-r">
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
              <p className="text-sm font-bold text-[#c7a35a]">Hostal Admin</p>
              <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">{role}</p>
            </div>
          </div>
          {open ? (
            <span className="text-sm font-semibold text-[#18221b] dark:text-zinc-100">Cerrar</span>
          ) : (
            <Menu className="h-5 w-5 text-[#18221b] dark:text-zinc-100" aria-hidden="true" />
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
            <p className="text-lg font-bold text-[#c7a35a]">Hostal Admin</p>
            <p className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{role}</p>
          </div>
        </div>
        <div className="px-4 pb-6">{renderNav(false)}</div>
      </div>
    </aside>
  );
};
