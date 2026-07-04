import Link from "next/link";
import { DataTable } from "@/components/crud/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Reserva } from "@/types/database";

export default async function ReservasPage() {
  await requireAdminModule("reservas");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("reservas")
    .select("id,huesped_id,habitacion_id,tarifa_id,fecha_ingreso,fecha_salida,num_noches,precio_total,estado,created_at")
    .order("created_at", { ascending: false });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reservas</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Reservas creadas por clientes o personal.</p>
        </div>
        <Button asChild>
          <Link href="/admin/reservas/nueva">Nueva reserva</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Reserva>
            data={data ?? []}
            empty="No hay reservas registradas."
            columns={[
              { key: "ingreso", header: "Ingreso", render: (row) => row.fecha_ingreso },
              { key: "salida", header: "Salida", render: (row) => row.fecha_salida },
              { key: "noches", header: "Noches", render: (row) => row.num_noches },
              { key: "total", header: "Total", render: (row) => row.precio_total },
              { key: "estado", header: "Estado", render: (row) => <Badge variant="secondary">{row.estado}</Badge> },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}
