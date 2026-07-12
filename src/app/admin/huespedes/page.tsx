import Link from "next/link";
import { Pencil } from "lucide-react";
import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable } from "@/components/crud/table-columns";
import { HuespedForm } from "@/components/forms/HuespedForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Huesped } from "@/types/database";

export default async function HuespedesPage() {
  await requireAdminModule("huespedes");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("huespedes").select("*").order("nombre_completo");
  const huespedes = data ?? [];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Huéspedes</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Gestión de datos de huéspedes.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nuevo huésped</CardTitle>
        </CardHeader>
        <CardContent>
          <HuespedForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Huesped>
            data={huespedes}
            empty="No hay huéspedes registrados."
            columns={[
              ...columnsForTable<Huesped>("huespedes", huespedes),
              {
                key: "acciones",
                header: "Acciones",
                render: (row) => (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/huespedes/${row.id}/editar`}>
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
