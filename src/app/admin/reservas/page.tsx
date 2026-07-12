import Link from "next/link";
import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable } from "@/components/crud/table-columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { allColumnsValue, ilikePattern, orIlike, parseTableQuery, searchableColumnsByTable, sortableColumnsByTable, tableStateFromQuery, type TableQueryInput } from "@/lib/table-server";
import { userNamesByIdForRows } from "@/lib/table-user-references";
import type { Reserva } from "@/types/database";

export default async function ReservasPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  await requireAdminModule("reservas");
  const supabase = createSupabaseAdminClient();
  const searchableColumns = searchableColumnsByTable.reservas ?? [];
  const sortableColumns = sortableColumnsByTable.reservas ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultSort: "created_at",
    defaultDir: "desc",
    searchableColumns,
    sortableColumns,
  });
  let query = supabase
    .from("reservas")
    .select("*", { count: "exact" })
    .order(tableQuery.sort as "created_at", { ascending: tableQuery.dir === "asc" })
    .range(tableQuery.from, tableQuery.to);

  if (tableQuery.q) {
    query =
      tableQuery.qColumn === allColumnsValue
        ? query.or(orIlike(searchableColumns, tableQuery.q))
        : query.ilike(tableQuery.qColumn as "codigo_reserva", ilikePattern(tableQuery.q));
  }

  const { data, count } = await query;
  const reservas = data ?? [];
  const userNamesById = await userNamesByIdForRows(supabase, reservas);

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
            data={reservas}
            empty="No hay reservas registradas."
            columns={columnsForTable<Reserva>("reservas", reservas, { userNamesById })}
            serverState={tableStateFromQuery(tableQuery, count ?? 0)}
            searchableColumns={searchableColumns}
            sortableColumns={sortableColumns}
          />
        </CardContent>
      </Card>
    </section>
  );
}
