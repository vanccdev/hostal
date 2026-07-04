import { ReservaForm } from "@/components/forms/ReservaForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function NuevaReservaClientePage() {
  await requirePasswordReady();
  const supabase = createSupabaseAdminClient();
  const [{ data: habitaciones }, { data: tarifas }] = await Promise.all([
    supabase.from("habitaciones").select("id,numero,tipo,piso,capacidad_max,descripcion,activa,created_at").order("numero"),
    supabase
      .from("tarifas")
      .select("id,habitacion_tipo,temporada,precio_noche,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
      .eq("activa", true)
      .order("habitacion_tipo"),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva reserva</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">La reserva se asociará automáticamente a tu cuenta.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Fechas y habitación</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservaForm mode="cliente" habitaciones={habitaciones ?? []} tarifas={tarifas ?? []} />
        </CardContent>
      </Card>
    </section>
  );
}
