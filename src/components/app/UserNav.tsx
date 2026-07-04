import Link from "next/link";
import { Bell, CalendarDays, CreditCard, Home, LogOut, User } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const items = [
  { href: "/app", label: "Inicio", icon: Home },
  { href: "/app/perfil", label: "Perfil", icon: User },
  { href: "/app/reservas", label: "Reservas", icon: CalendarDays },
  { href: "/app/pagos", label: "Pagos", icon: CreditCard },
  { href: "/app/notificaciones", label: "Notificaciones", icon: Bell },
];

export const UserNav = () => (
  <header className="border-b border-zinc-200 bg-white">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
      <Link href="/app" className="font-semibold text-zinc-950">
        Hostal
      </Link>
      <nav aria-label="Portal cliente" className="flex flex-wrap items-center gap-1">
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
    </div>
  </header>
);

