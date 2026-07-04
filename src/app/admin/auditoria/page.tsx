import { DataTable } from "@/components/crud/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { GenericRow } from "@/types/database";

export default async function AuditoriaPage() {
  await requireAdminModule("auditoria");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoría</h1>
        <p className="text-sm text-zinc-600">Lectura solo admin.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Últimos eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<GenericRow>
            data={(data ?? []) as GenericRow[]}
            empty="No hay registros de auditoría."
            columns={[
              { key: "accion", header: "Acción", render: (row) => String(row.accion ?? "-") },
              { key: "entidad", header: "Entidad", render: (row) => String(row.entidad ?? "-") },
              { key: "created", header: "Fecha", render: (row) => String(row.created_at ?? "-") },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}

