import { Pencil } from "lucide-react";
import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable } from "@/components/crud/table-columns";
import { TarifaForm } from "@/components/forms/TarifaForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { allColumnsValue, ilikePattern, orIlike, parseTableQuery, searchableColumnsByTable, sortableColumnsByTable, tableStateFromQuery, type TableQueryInput } from "@/lib/table-server";
import type { Tarifa } from "@/types/database";

export default async function TarifasPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  await requireAdminModule("tarifas");
  const supabase = createSupabaseAdminClient();
  const searchableColumns = searchableColumnsByTable.tarifas ?? [];
  const sortableColumns = sortableColumnsByTable.tarifas ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultSort: "habitacion_tipo",
    defaultDir: "asc",
    searchableColumns,
    sortableColumns,
  });
  let query = supabase
    .from("tarifas")
    .select("*", { count: "exact" })
    .order(tableQuery.sort as "habitacion_tipo", { ascending: tableQuery.dir === "asc" })
    .range(tableQuery.from, tableQuery.to);

  if (tableQuery.q) {
    query =
      tableQuery.qColumn === allColumnsValue
        ? query.or(orIlike(searchableColumns, tableQuery.q))
        : query.ilike(tableQuery.qColumn as "habitacion_tipo", ilikePattern(tableQuery.q));
  }

  const { data, count } = await query;
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
            serverState={tableStateFromQuery(tableQuery, count ?? 0)}
            searchableColumns={searchableColumns}
            sortableColumns={sortableColumns}
            columns={[
              ...columnsForTable<Tarifa>("tarifas", tarifas),
              {
                key: "acciones",
                header: "Acciones",
                render: (row) => (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Editar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar tarifa</DialogTitle>
                        <DialogDescription>Actualiza la tarifa sin salir del listado.</DialogDescription>
                      </DialogHeader>
                      <TarifaForm tarifa={row} />
                    </DialogContent>
                  </Dialog>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}
