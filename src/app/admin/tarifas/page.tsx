import { DataTable } from "@/components/crud/DataTable";
import { TarifaForm } from "@/components/forms/TarifaForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tarifa } from "@/types/database";

export default async function TarifasPage() {
  await requireAdminModule("tarifas");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("tarifas")
    .select("id,habitacion_tipo,temporada,precio_noche,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
    .order("habitacion_tipo");

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tarifas</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Módulo solo para admin.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nueva tarifa</CardTitle>
        </CardHeader>
        <CardContent>
          <TarifaForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Tarifa>
            data={data ?? []}
            empty="No hay tarifas registradas."
            columns={[
              { key: "tipo", header: "Tipo", render: (row) => row.habitacion_tipo },
              { key: "temporada", header: "Temporada", render: (row) => row.temporada },
              { key: "precio", header: "Precio noche", render: (row) => row.precio_noche },
              { key: "vigente", header: "Vigente desde", render: (row) => row.vigente_desde },
              { key: "activa", header: "Activa", render: (row) => (row.activa === false ? "No" : "Sí") },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}
