import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const tables = ["habitaciones", "huespedes", "reservas", "usuarios"] as const;
const labels: Record<(typeof tables)[number], string> = {
  habitaciones: "Habitaciones",
  huespedes: "Huéspedes",
  reservas: "Reservas",
  usuarios: "Usuarios",
};

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
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Resumen operativo del hostal.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counts.map((item) => (
          <Card key={item.table} className="overflow-hidden">
            <CardHeader>
              <CardTitle>{labels[item.table]}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-[#c7a35a]">{item.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
