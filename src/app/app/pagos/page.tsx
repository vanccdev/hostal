import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable } from "@/components/crud/table-columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { getGuestForUser } from "@/lib/db/current-guest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  allColumnsValue,
  ilikePattern,
  orIlike,
  parseTableQuery,
  searchableColumnsByTable,
  sortableColumnsByTable,
  tableStateFromQuery,
  type TableQueryInput,
} from "@/lib/table-server";
import { userNamesByIdForRows } from "@/lib/table-user-references";
import type { Transaccion } from "@/types/database";

export default async function PagosPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  const currentUser = await requirePasswordReady();
  const guest = await getGuestForUser(currentUser.authUserId);
  const supabase = createSupabaseAdminClient();
  const searchableColumns = searchableColumnsByTable.transacciones ?? [];
  const sortableColumns = sortableColumnsByTable.transacciones ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultSort: "created_at",
    defaultDir: "desc",
    searchableColumns,
    sortableColumns,
  });
  const { data: guestReservations } = guest
    ? await supabase.from("reservas").select("id").eq("huesped_id", guest.id)
    : { data: [] };
  const reservationIds = (guestReservations ?? []).map((reservation) => reservation.id);
  let query = reservationIds.length > 0
    ? supabase
        .from("transacciones")
        .select("*", { count: "exact" })
        .in("reserva_id", reservationIds)
        .order(tableQuery.sort as "created_at", { ascending: tableQuery.dir === "asc" })
        .range(tableQuery.from, tableQuery.to)
    : null;

  if (query && tableQuery.q) {
    query =
      tableQuery.qColumn === allColumnsValue
        ? query.or(orIlike(searchableColumns, tableQuery.q))
        : query.ilike(tableQuery.qColumn as "referencia_externa", ilikePattern(tableQuery.q));
  }

  const { data, count } = query ? await query : { data: [], count: 0 };
  const transacciones = data ?? [];
  const userNamesById = await userNamesByIdForRows(supabase, transacciones);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pagos</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Pagos asociados a tus reservas.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Mis pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Transaccion>
            data={transacciones}
            empty="No hay pagos registrados."
            columns={columnsForTable<Transaccion>("transacciones", transacciones, { userNamesById })}
            serverState={tableStateFromQuery(tableQuery, count ?? 0)}
            searchableColumns={searchableColumns}
            sortableColumns={sortableColumns}
          />
        </CardContent>
      </Card>
    </section>
  );
}
