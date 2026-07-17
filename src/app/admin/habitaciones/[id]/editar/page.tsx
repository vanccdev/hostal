import Link from "next/link";
import { notFound } from "next/navigation";
import { HabitacionForm } from "@/components/forms/HabitacionForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function EditarHabitacionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminModule("habitaciones");
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const [{ data: habitacion }, { data: imagenes }, { data: availableTarifas }] = await Promise.all([
    supabase
      .from("habitaciones")
      .select("id,numero,tipo,tarifa_id,piso,capacidad_max,descripcion,activa,created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("img_habitaciones")
      .select("id,url")
      .eq("habitacion_id", id)
      .order("created_at"),
    supabase
      .from("tarifas")
      .select("id,habitacion_tipo,temporada,precio_noche,peso,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
      .eq("activa", true)
      .order("habitacion_tipo"),
  ]);

  if (!habitacion) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Editar habitación</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{habitacion.numero}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/habitaciones">Volver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos de habitación</CardTitle>
        </CardHeader>
        <CardContent>
          <HabitacionForm habitacion={habitacion} existingImages={imagenes ?? []} tarifas={availableTarifas ?? []} />
        </CardContent>
      </Card>
    </section>
  );
}
