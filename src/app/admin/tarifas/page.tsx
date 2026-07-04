import { DataTable } from "@/components/crud/DataTable";
import { TarifaForm } from "@/components/forms/TarifaForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tarifa } from "@/types/database";

export default async function TarifasPage() {
  await requireAdminModule("tarifas");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("tarifas").select("id,nombre,precio_noche,activa").order("nombre");

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tarifas</h1>
        <p className="text-sm text-zinc-600">Módulo solo para admin.</p>
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
              { key: "nombre", header: "Nombre", render: (row) => row.nombre },
              { key: "precio", header: "Precio noche", render: (row) => row.precio_noche },
              { key: "activa", header: "Activa", render: (row) => (row.activa === false ? "No" : "Sí") },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}

