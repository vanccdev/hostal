import { Pencil } from "lucide-react";
import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable } from "@/components/crud/table-columns";
import { HuespedForm } from "@/components/forms/HuespedForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { allColumnsValue, ilikePattern, orIlike, parseTableQuery, searchableColumnsByTable, sortableColumnsByTable, tableStateFromQuery, type TableQueryInput } from "@/lib/table-server";
import type { Huesped } from "@/types/database";

export default async function HuespedesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  await requireAdminModule("huespedes");
  const supabase = createSupabaseAdminClient();
  const searchableColumns = searchableColumnsByTable.huespedes ?? [];
  const sortableColumns = sortableColumnsByTable.huespedes ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultSort: "nombre_completo",
    defaultDir: "asc",
    searchableColumns,
    sortableColumns,
  });
  let query = supabase
    .from("huespedes")
    .select("*", { count: "exact" })
    .order(tableQuery.sort as "nombre_completo", { ascending: tableQuery.dir === "asc" })
    .range(tableQuery.from, tableQuery.to);

  if (tableQuery.q) {
    query =
      tableQuery.qColumn === allColumnsValue
        ? query.or(orIlike(searchableColumns, tableQuery.q))
        : query.ilike(tableQuery.qColumn as "nombre_completo", ilikePattern(tableQuery.q));
  }

  const { data, count } = await query;
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
            serverState={tableStateFromQuery(tableQuery, count ?? 0)}
            searchableColumns={searchableColumns}
            sortableColumns={sortableColumns}
            columns={[
              ...columnsForTable<Huesped>("huespedes", huespedes),
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
                        <DialogTitle>Editar huésped</DialogTitle>
                        <DialogDescription>Actualiza los datos del huésped sin salir del listado.</DialogDescription>
                      </DialogHeader>
                      <HuespedForm huesped={row} />
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
