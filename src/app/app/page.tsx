import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { formatDate } from "@/lib/datetime";
import { getGuestForUser } from "@/lib/db/current-guest";
import { formatReservaEstado } from "@/lib/reserva-estado";
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
          <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Portal de cliente.</p>
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
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">No tienes reservas registradas.</p>
          ) : (
            reservations?.map((reservation) => (
              <Link
                key={reservation.id}
                href={`/app/reservas/${reservation.id}`}
                className="block rounded-2xl border border-[#d8d4c8] bg-white p-4 text-sm font-medium text-[#18221b] transition hover:border-[#c7a35a] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:border-[#314237] dark:bg-[#18251d] dark:text-zinc-100"
              >
                {formatDate(reservation.fecha_ingreso)} a {formatDate(reservation.fecha_salida)} ·{" "}
                {formatReservaEstado(reservation.estado)}
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
