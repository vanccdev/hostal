import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { getGuestForUser } from "@/lib/db/current-guest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function ClientDashboardPage() {
  const currentUser = await requirePasswordReady();
  const supabase = createSupabaseAdminClient();
  const guest = await getGuestForUser(currentUser.authUserId);
  const { data: reservations } = guest
    ? await supabase
        .from("reservas")
        .select("id,fecha_ingreso,fecha_salida,estado,precio_total")
        .eq("huesped_id", guest.id)
        .order("fecha_ingreso")
        .limit(5)
    : { data: [] };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hola, {currentUser.profile?.nombre}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Portal de cliente.</p>
        </div>
        <Button asChild>
          <Link href="/app/reservas/nueva">Nueva reserva</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Próximas reservas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(reservations ?? []).length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No tienes reservas registradas.</p>
          ) : (
            reservations?.map((reservation) => (
              <Link
                key={reservation.id}
                href={`/app/reservas/${reservation.id}`}
                className="block rounded-md border border-zinc-200 p-3 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                {reservation.fecha_ingreso} a {reservation.fecha_salida} · {reservation.estado}
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
