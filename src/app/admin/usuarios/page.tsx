import Link from "next/link";
import { KeyRound } from "lucide-react";
import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable } from "@/components/crud/table-columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { allColumnsValue, ilikePattern, orIlike, parseTableQuery, searchableColumnsByTable, sortableColumnsByTable, tableStateFromQuery, type TableQueryInput } from "@/lib/table-server";
import type { Usuario } from "@/types/database";

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  const currentUser = await requireAdminModule("usuarios");
  const supabase = createSupabaseAdminClient();
  const searchableColumns = searchableColumnsByTable.usuarios ?? [];
  const sortableColumns = sortableColumnsByTable.usuarios ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultSort: "created_at",
    defaultDir: "desc",
    searchableColumns,
    sortableColumns,
  });
  let query = supabase
    .from("usuarios")
    .select("*", { count: "exact" })
    .order(tableQuery.sort as "created_at", { ascending: tableQuery.dir === "asc" })
    .range(tableQuery.from, tableQuery.to);

  if (currentUser.profile!.rol === "recepcionista") {
    query = query.eq("rol", "cliente");
  }

  if (tableQuery.q) {
    query =
      tableQuery.qColumn === allColumnsValue
        ? query.or(orIlike(searchableColumns, tableQuery.q))
        : query.ilike(tableQuery.qColumn as "nombre", ilikePattern(tableQuery.q));
  }

  const { data, count } = await query;
  const usuarios = data ?? [];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Admin gestiona todos; recepción solo clientes.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Usuario>
            data={usuarios}
            empty="No hay usuarios."
            serverState={tableStateFromQuery(tableQuery, count ?? 0)}
            searchableColumns={searchableColumns}
            sortableColumns={sortableColumns}
            columns={[
              ...columnsForTable<Usuario>("usuarios", usuarios),
              {
                key: "acciones",
                header: "Acciones",
                render: (row) =>
                  row.rol === "cliente" ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/usuarios/${row.id}/reset-password`}>
                        <KeyRound className="h-4 w-4" aria-hidden="true" />
                        Reset
                      </Link>
                    </Button>
                  ) : (
                    "-"
                  ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}
