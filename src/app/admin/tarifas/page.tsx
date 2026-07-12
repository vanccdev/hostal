import Link from "next/link";
import { Pencil } from "lucide-react";
import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable } from "@/components/crud/table-columns";
import { TarifaForm } from "@/components/forms/TarifaForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tarifa } from "@/types/database";

export default async function TarifasPage() {
  await requireAdminModule("tarifas");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("tarifas").select("*").order("habitacion_tipo");
  const tarifas = data ?? [];

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
            data={tarifas}
            empty="No hay tarifas registradas."
            columns={[
              ...columnsForTable<Tarifa>("tarifas", tarifas),
              {
                key: "acciones",
                header: "Acciones",
                render: (row) => (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/tarifas/${row.id}/editar`}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Editar
                    </Link>
                  </Button>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}
