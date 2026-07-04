import { ReservaForm } from "@/components/forms/ReservaForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function NuevaReservaClientePage() {
  await requirePasswordReady();
  const supabase = createSupabaseAdminClient();
  const [{ data: habitaciones }, { data: tarifas }] = await Promise.all([
    supabase.from("habitaciones").select("id,nombre,numero,tipo,capacidad,precio_base,estado,activa").order("numero"),
    supabase.from("tarifas").select("id,nombre,precio_noche,activa").order("nombre"),
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
