 "use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, CreditCard, Home, LogOut, Menu, User } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const items = [
  { href: "/app", label: "Inicio", icon: Home },
  { href: "/app/perfil", label: "Perfil", icon: User },
  { href: "/app/reservas", label: "Reservas", icon: CalendarDays },
  { href: "/app/pagos", label: "Pagos", icon: CreditCard },
  { href: "/app/notificaciones", label: "Notificaciones", icon: Bell },
];

export const UserNav = () => {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[#dddddd] bg-white/95 backdrop-blur dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/app" className="flex items-center gap-2 text-lg font-bold text-[#ff385c]">
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#153f2a]">
            <Image src="/icono.jpg" alt="Hostal Plaza Camargo" fill sizes="36px" className="object-cover" />
          </span>
          <span>Hostal</span>
        </Link>
        <nav aria-label="Portal cliente" className="hidden items-center gap-1 md:flex">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Button key={item.href} asChild variant={active ? "secondary" : "ghost"} size="sm">
                <Link href={item.href}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Salir
            </Button>
          </form>
        </nav>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="md:hidden" aria-label="Abrir menú">
              <Menu className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="gap-2">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
            <form action={logoutAction}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full gap-2">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Salir
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
