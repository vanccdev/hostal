import Link from "next/link";
import { KeyRound } from "lucide-react";
import { DataTable } from "@/components/crud/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Usuario } from "@/types/database";

export default async function UsuariosPage() {
  const currentUser = await requireAdminModule("usuarios");
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("usuarios").select("id,nombre,rol,activo,created_at,must_change_password").order("created_at");

  if (currentUser.profile!.rol === "recepcionista") {
    query = query.eq("rol", "cliente");
  }

  const { data } = await query;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-zinc-600">Admin gestiona todos; recepción solo clientes.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Usuario>
            data={data ?? []}
            empty="No hay usuarios."
            columns={[
              { key: "nombre", header: "Nombre", render: (row) => row.nombre },
              { key: "rol", header: "Rol", render: (row) => <Badge variant="outline">{row.rol}</Badge> },
              { key: "activo", header: "Activo", render: (row) => (row.activo ? "Sí" : "No") },
              { key: "password", header: "Cambio pendiente", render: (row) => (row.must_change_password ? "Sí" : "No") },
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

