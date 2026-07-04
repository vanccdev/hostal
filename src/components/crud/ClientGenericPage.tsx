import { DataTable } from "@/components/crud/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { getGuestForUser } from "@/lib/db/current-guest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, GenericRow } from "@/types/database";

type TableName = keyof Database["public"]["Tables"];

type ClientGenericPageProps = {
  title: string;
  description: string;
  table: TableName;
  filterBy: "huesped_id" | "usuario_id";
};

export const ClientGenericPage = async ({ title, description, table, filterBy }: ClientGenericPageProps) => {
  const currentUser = await requirePasswordReady();
  const guest = await getGuestForUser(currentUser.authUserId);
  const supabase = createSupabaseAdminClient();
  const filterValue = filterBy === "usuario_id" ? currentUser.authUserId : guest?.id;
  const { data } = filterValue
    ? await supabase.from(table).select("*").eq(filterBy as "id", filterValue).limit(100)
    : { data: [] };
  const rows = (data ?? []) as GenericRow[];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-zinc-600">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Mis registros</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<GenericRow>
            data={rows}
            empty="No hay registros."
            columns={[
              { key: "id", header: "ID", render: (row) => row.id },
              { key: "created", header: "Fecha", render: (row) => String(row.created_at ?? "-") },
              {
                key: "data",
                header: "Datos",
                render: (row) => <span className="line-clamp-2">{JSON.stringify(row)}</span>,
              },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
};
