import { HabitacionForm } from "@/components/forms/HabitacionForm";
import { DataTable } from "@/components/crud/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Habitacion } from "@/types/database";

export default async function HabitacionesPage() {
  await requireAdminModule("habitaciones");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("habitaciones")
    .select("id,nombre,numero,tipo,capacidad,precio_base,estado,activa")
    .order("numero");

  const habitaciones = data ?? [];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Habitaciones</h1>
        <p className="text-sm text-zinc-600">CRUD inicial de habitaciones.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nueva habitación</CardTitle>
        </CardHeader>
        <CardContent>
          <HabitacionForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Habitacion>
            data={habitaciones}
            empty="No hay habitaciones registradas."
            columns={[
              { key: "numero", header: "Número", render: (row) => row.numero ?? row.nombre ?? row.id },
              { key: "tipo", header: "Tipo", render: (row) => row.tipo ?? "-" },
              { key: "capacidad", header: "Capacidad", render: (row) => row.capacidad ?? "-" },
              { key: "precio", header: "Precio base", render: (row) => row.precio_base ?? "-" },
              { key: "estado", header: "Estado", render: (row) => <Badge variant="secondary">{row.estado ?? "-"}</Badge> },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}

