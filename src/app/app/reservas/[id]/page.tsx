import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { formatDate } from "@/lib/datetime";
import { getGuestForUser } from "@/lib/db/current-guest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function DetalleReservaPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requirePasswordReady();
  const guest = await getGuestForUser(currentUser.authUserId);
  const { id } = await params;

  if (!guest) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const { data: reserva } = await supabase
    .from("reservas")
    .select("id,huesped_id,habitacion_id,tarifa_id,fecha_ingreso,fecha_salida,num_noches,precio_total,estado,created_at")
    .eq("id", id)
    .eq("huesped_id", guest.id)
    .maybeSingle();

  if (!reserva) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Detalle de reserva</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Reserva {reserva.id}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {formatDate(reserva.fecha_ingreso)} a {formatDate(reserva.fecha_salida)}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <p>Noches: {reserva.num_noches}</p>
          <p>Total: {reserva.precio_total}</p>
          <p>Habitación: {reserva.habitacion_id}</p>
          <p>
            Estado: <Badge variant="secondary">{reserva.estado}</Badge>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
