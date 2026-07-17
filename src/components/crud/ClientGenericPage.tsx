import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable, genericRows } from "@/components/crud/table-columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { getGuestForUser } from "@/lib/db/current-guest";
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

type ClientGenericPageProps = {
  title: string;
  description: string;
  table: TableName;
  filterBy: "huesped_id" | "usuario_id" | "uploaded_by";
  searchParams?: TableQueryInput;
};

export const ClientGenericPage = async ({ title, description, table, filterBy, searchParams }: ClientGenericPageProps) => {
  const currentUser = await requirePasswordReady();
  const guest = await getGuestForUser(currentUser.authUserId);
  const supabase = createSupabaseAdminClient();
  const filterValue = filterBy === "usuario_id" || filterBy === "uploaded_by" ? currentUser.authUserId : guest?.id;
  const searchableColumns = searchableColumnsByTable[table] ?? ["id"];
  const sortableColumns = sortableColumnsByTable[table] ?? ["id"];
  const tableQuery = parseTableQuery(searchParams, {
    defaultSort: sortableColumns[0] ?? "id",
    defaultDir: "desc",
    searchableColumns,
    sortableColumns,
  });
  let query = filterValue
    ? supabase
        .from(table)
        .select("*", { count: "exact" })
        .eq(filterBy as "id", filterValue)
        .order(tableQuery.sort as "id", { ascending: tableQuery.dir === "asc" })
        .range(tableQuery.from, tableQuery.to)
    : null;

  if (query && tableQuery.q) {
    query =
      tableQuery.qColumn === allColumnsValue
        ? query.or(orIlike(searchableColumns, tableQuery.q))
        : query.ilike(tableQuery.qColumn as "id", `%${tableQuery.q}%`);
  }

  const { data, count } = query ? await query : { data: [], count: 0 };
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
          <CardTitle>Mis registros</CardTitle>
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
