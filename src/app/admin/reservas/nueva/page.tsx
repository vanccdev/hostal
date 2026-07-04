import { ReservaForm } from "@/components/forms/ReservaForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function NuevaReservaAdminPage() {
  await requireAdminModule("reservas");
  const supabase = createSupabaseAdminClient();
  const [{ data: habitaciones }, { data: tarifas }, { data: huespedes }] = await Promise.all([
    supabase.from("habitaciones").select("id,numero,tipo,piso,capacidad_max,descripcion,activa,created_at").order("numero"),
    supabase
      .from("tarifas")
      .select("id,habitacion_tipo,temporada,precio_noche,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
      .eq("activa", true)
      .order("habitacion_tipo"),
    supabase
      .from("huespedes")
      .select("id,usuario_id,nombre_completo,email,telefono,tipo_documento,numero_documento,pais_origen")
      .order("nombre_completo"),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva reserva</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Selecciona un huésped existente para no duplicar cuentas.</p>
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
