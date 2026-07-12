import Link from "next/link";
import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable } from "@/components/crud/table-columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { getGuestForUser } from "@/lib/db/current-guest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Reserva } from "@/types/database";

export default async function ReservasClientePage() {
  const currentUser = await requirePasswordReady();
  const guest = await getGuestForUser(currentUser.authUserId);
  const supabase = createSupabaseAdminClient();
  const { data } = guest
    ? await supabase
        .from("reservas")
        .select("*")
        .eq("huesped_id", guest.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const reservas = data ?? [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mis reservas</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Solo puedes ver tus propias reservas.</p>
        </div>
        <Button asChild>
          <Link href="/app/reservas/nueva">Nueva reserva</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Reserva>
            data={reservas}
            empty="No tienes reservas."
            columns={[
              ...columnsForTable<Reserva>("reservas", reservas),
              {
                key: "detalle",
                header: "Detalle",
                render: (row) => (
                  <Link className="text-sm font-medium underline underline-offset-4" href={`/app/reservas/${row.id}`}>
                    Ver
                  </Link>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}
