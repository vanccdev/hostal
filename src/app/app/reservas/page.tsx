import Link from "next/link";
import { DataTable } from "@/components/crud/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { getGuestForUser } from "@/lib/db/current-guest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Reserva } from "@/types/database";

export default async function ReservasClientePage() {
  const currentUser = await requirePasswordReady();
  const guest = await getGuestForUser(currentUser.authUserId);
  const supabase = createSupabaseAdminClient();
  const { data } = guest
    ? await supabase
        .from("reservas")
        .select(
          "id,codigo_reserva,huesped_id,habitacion_id,tarifa_id,fecha_ingreso,fecha_salida,num_noches,num_huespedes,canal_origen,estado,precio_total,precio_ajustado,motivo_ajuste,notas_internas,registrado_por,checkin_at,checkout_at,created_at,updated_at",
        )
        .eq("huesped_id", guest.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mis reservas</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Solo puedes ver tus propias reservas.</p>
        </div>
        <Button asChild>
          <Link href="/app/reservas/nueva">Nueva reserva</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Reserva>
            data={data ?? []}
            empty="No tienes reservas."
            columns={[
              { key: "codigo", header: "Código", render: (row) => row.codigo_reserva },
              { key: "ingreso", header: "Ingreso", render: (row) => row.fecha_ingreso },
              { key: "salida", header: "Salida", render: (row) => row.fecha_salida },
              { key: "total", header: "Total", render: (row) => row.precio_total },
              { key: "estado", header: "Estado", render: (row) => <Badge variant="secondary">{row.estado}</Badge> },
              {
                key: "detalle",
                header: "Detalle",
                render: (row) => (
                  <Link className="text-sm font-medium underline underline-offset-4" href={`/app/reservas/${row.id}`}>
                    Ver
                  </Link>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}
