import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable, genericRows } from "@/components/crud/table-columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { allColumnsValue, ilikePattern, orIlike, parseTableQuery, searchableColumnsByTable, sortableColumnsByTable, tableStateFromQuery, type TableQueryInput } from "@/lib/table-server";
import { userNamesByIdForRows } from "@/lib/table-user-references";
import type { GenericRow } from "@/types/database";

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  await requireAdminModule("auditoria");
  const supabase = createSupabaseAdminClient();
  const searchableColumns = searchableColumnsByTable.audit_log ?? [];
  const sortableColumns = sortableColumnsByTable.audit_log ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultSort: "created_at",
    defaultDir: "desc",
    searchableColumns,
    sortableColumns,
  });
  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order(tableQuery.sort as "created_at", { ascending: tableQuery.dir === "asc" })
    .range(tableQuery.from, tableQuery.to);

  if (tableQuery.q) {
    query =
      tableQuery.qColumn === allColumnsValue
        ? query.or(orIlike(searchableColumns, tableQuery.q))
        : query.ilike(tableQuery.qColumn as "accion", ilikePattern(tableQuery.q));
  }

  const { data, count } = await query;
  const rows = genericRows(data);
  const userNamesById = await userNamesByIdForRows(supabase, rows);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoría</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lectura solo admin.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Últimos eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<GenericRow>
            data={rows}
            empty="No hay registros de auditoría."
            columns={columnsForTable<GenericRow>("audit_log", rows, { userNamesById })}
            serverState={tableStateFromQuery(tableQuery, count ?? 0)}
            searchableColumns={searchableColumns}
            sortableColumns={sortableColumns}
          />
        </CardContent>
      </Card>
    </section>
  );
}
