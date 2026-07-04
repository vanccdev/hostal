import Link from "next/link";
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

export const UserNav = () => (
  <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
    <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
      <Link href="/app" className="font-semibold text-zinc-950 dark:text-zinc-100">
        Hostal
      </Link>
      <nav aria-label="Portal cliente" className="hidden items-center gap-1 md:flex">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Button key={item.href} asChild variant="ghost" size="sm">
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
