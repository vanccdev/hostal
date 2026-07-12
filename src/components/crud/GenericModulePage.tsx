import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable, genericRows } from "@/components/crud/table-columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import type { AdminModule } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  allColumnsValue,
  orIlike,
  parseTableQuery,
  searchableColumnsByTable,
  sortableColumnsByTable,
  tableStateFromQuery,
  type TableQueryInput,
} from "@/lib/table-server";
import { userNamesByIdForRows } from "@/lib/table-user-references";
import type { Database, GenericRow } from "@/types/database";

type TableName = keyof Database["public"]["Tables"];

type GenericModulePageProps = {
  title: string;
  description: string;
  module: AdminModule;
  table: TableName;
  searchParams?: TableQueryInput;
};

export const GenericModulePage = async ({ title, description, module, table, searchParams }: GenericModulePageProps) => {
  await requireAdminModule(module);
  const supabase = createSupabaseAdminClient();
  const searchableColumns = searchableColumnsByTable[table] ?? ["id"];
  const sortableColumns = sortableColumnsByTable[table] ?? ["id"];
  const tableQuery = parseTableQuery(searchParams, {
    defaultSort: sortableColumns[0] ?? "id",
    defaultDir: "desc",
    searchableColumns,
    sortableColumns,
  });
  let query = supabase
    .from(table)
    .select("*", { count: "exact" })
    .order(tableQuery.sort as "id", { ascending: tableQuery.dir === "asc" })
    .range(tableQuery.from, tableQuery.to);

  if (tableQuery.q) {
    query =
      tableQuery.qColumn === allColumnsValue
        ? query.or(orIlike(searchableColumns, tableQuery.q))
        : query.ilike(tableQuery.qColumn as "id", `%${tableQuery.q}%`);
  }

  const { data, count } = await query;
  const rows = genericRows(data);
  const userNamesById = await userNamesByIdForRows(supabase, rows);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<GenericRow>
            data={rows}
            empty="No hay registros."
            columns={columnsForTable<GenericRow>(table, rows, { userNamesById })}
            serverState={tableStateFromQuery(tableQuery, count ?? 0)}
            searchableColumns={searchableColumns}
            sortableColumns={sortableColumns}
          />
        </CardContent>
      </Card>
    </section>
  );
};
