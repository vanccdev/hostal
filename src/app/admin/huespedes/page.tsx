import Link from "next/link";
import { DataTable } from "@/components/crud/DataTable";
import type { Column } from "@/components/crud/DataTable";
import { columnsForTable } from "@/components/crud/table-columns";
import { HuespedEditDialog } from "@/components/forms/HuespedEditDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { authUserIdsMatchingContact, userContactsById } from "@/lib/auth/user-contact";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { allColumnsValue, ilikePattern, orIlike, parseTableQuery, searchableColumnsByTable, sortableColumnsByTable, tableStateFromQuery, type TableQueryInput } from "@/lib/table-server";
import { userNamesByIdForRows } from "@/lib/table-user-references";
import type { Huesped, Usuario } from "@/types/database";

export default async function HuespedesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  await requireAdminModule("huespedes");
  const supabase = createSupabaseAdminClient();
  const searchableColumns = searchableColumnsByTable.huespedes ?? [];
  const sortableColumns = sortableColumnsByTable.huespedes ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultSort: "created_at",
    defaultDir: "asc",
    searchableColumns,
    sortableColumns,
  });
  let matchedUserIds: string[] = [];

  if (tableQuery.q) {
    const pattern = ilikePattern(tableQuery.q);
    const [{ data: matchedUsuarios }, authMatchedIds] = await Promise.all([
      supabase.from("usuarios").select("id").ilike("nombre", pattern).limit(100),
      authUserIdsMatchingContact(supabase, tableQuery.q),
    ]);

    matchedUserIds = Array.from(new Set([...(matchedUsuarios ?? []).map((usuario) => usuario.id), ...authMatchedIds]));
  }

  let query = supabase
    .from("huespedes")
    .select("*", { count: "exact" })
    .order(tableQuery.sort as "created_at", { ascending: tableQuery.dir === "asc" })
    .range(tableQuery.from, tableQuery.to);

  if (tableQuery.q) {
    const pattern = ilikePattern(tableQuery.q);

    if (tableQuery.qColumn === allColumnsValue) {
      const filters = [orIlike(searchableColumns, tableQuery.q)];

      if (matchedUserIds.length > 0) {
        filters.push(`usuario_id.in.(${matchedUserIds.join(",")})`);
      }

      query = query.or(filters.join(","));
    } else {
      query = query.ilike(tableQuery.qColumn as "numero_documento", pattern);
    }
  }

  const { data, count } = await query;
  const huespedes = data ?? [];
  const userNamesById = await userNamesByIdForRows(supabase, huespedes);
  const usuarioIds = Array.from(new Set(huespedes.map((huesped) => huesped.usuario_id)));
  const { data: usuarios } =
    usuarioIds.length > 0 ? await supabase.from("usuarios").select("id,nombre").in("id", usuarioIds) : { data: [] as Pick<Usuario, "id" | "nombre">[] };
  const contactsById = await userContactsById(supabase, usuarios ?? []);
  const contactColumns: Column<Huesped>[] = [
    {
      key: "cliente_nombre",
      header: "Cliente",
      render: (row) => contactsById.get(row.usuario_id)?.nombre ?? userNamesById[row.usuario_id] ?? "-",
    },
    {
      key: "cliente_email",
      header: "Email",
      render: (row) => contactsById.get(row.usuario_id)?.email ?? "-",
    },
    {
      key: "cliente_telefono",
      header: "Teléfono",
      render: (row) => contactsById.get(row.usuario_id)?.telefono ?? "-",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Huéspedes</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            La identidad vive en usuarios/Auth; aquí se gestiona la ficha documental del huésped.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/clientes/nuevo">Crear cliente</Link>
        </Button>
      </div>
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
              ...contactColumns,
              ...columnsForTable<Huesped>("huespedes", huespedes, { userNamesById }),
              {
                key: "acciones",
                header: "Acciones",
                render: (row) => <HuespedEditDialog huesped={row} />,
              },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}
