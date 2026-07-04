import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const tables = ["habitaciones", "huespedes", "reservas", "usuarios"] as const;

export default async function AdminPage() {
  await requireAdminModule("dashboard");
  const supabase = createSupabaseAdminClient();
  const counts = await Promise.all(
    tables.map(async (table) => {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
      return { table, count: count ?? 0 };
    }),
  );

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel administrativo</h1>
        <p className="text-sm text-zinc-600">Resumen operativo del hostal.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counts.map((item) => (
          <Card key={item.table}>
            <CardHeader>
              <CardTitle className="capitalize">{item.table.replace("_", " ")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{item.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

