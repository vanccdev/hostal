import { ReservaForm } from "@/components/forms/ReservaForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function NuevaReservaAdminPage() {
  await requireAdminModule("reservas");
  const supabase = createSupabaseAdminClient();
  const [{ data: habitaciones }, { data: tarifas }, { data: huespedes }] = await Promise.all([
    supabase.from("habitaciones").select("id,nombre,numero,tipo,capacidad,precio_base,estado,activa").order("numero"),
    supabase.from("tarifas").select("id,nombre,precio_noche,activa").order("nombre"),
    supabase
      .from("huespedes")
      .select("id,usuario_id,nombre_completo,email,telefono,tipo_documento,numero_documento,pais")
      .order("nombre_completo"),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva reserva</h1>
        <p className="text-sm text-zinc-600">Selecciona un huésped existente para no duplicar cuentas.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos de reserva</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservaForm
            mode="staff"
            habitaciones={habitaciones ?? []}
            tarifas={tarifas ?? []}
            huespedes={huespedes ?? []}
          />
        </CardContent>
      </Card>
    </section>
  );
}

