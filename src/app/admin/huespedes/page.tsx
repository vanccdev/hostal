import { DataTable } from "@/components/crud/DataTable";
import { HuespedForm } from "@/components/forms/HuespedForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Huesped } from "@/types/database";

export default async function HuespedesPage() {
  await requireAdminModule("huespedes");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("huespedes")
    .select("id,usuario_id,nombre_completo,email,telefono,tipo_documento,numero_documento,pais")
    .order("nombre_completo");

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Huéspedes</h1>
        <p className="text-sm text-zinc-600">Gestión de datos de huéspedes.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nuevo huésped</CardTitle>
        </CardHeader>
        <CardContent>
          <HuespedForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Huesped>
            data={data ?? []}
            empty="No hay huéspedes registrados."
            columns={[
              { key: "nombre", header: "Nombre", render: (row) => row.nombre_completo },
              { key: "email", header: "Email", render: (row) => row.email ?? "-" },
              { key: "telefono", header: "Teléfono", render: (row) => row.telefono ?? "-" },
              { key: "documento", header: "Documento", render: (row) => row.numero_documento ?? "-" },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}

