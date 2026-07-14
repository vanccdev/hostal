import Link from "next/link";
import { notFound } from "next/navigation";
import { TarifaForm } from "@/components/forms/TarifaForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function EditarTarifaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminModule("tarifas");
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: tarifa } = await supabase
    .from("tarifas")
    .select(
      "id,habitacion_tipo,temporada,precio_noche,peso,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!tarifa) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Editar tarifa</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {tarifa.habitacion_tipo} / {tarifa.temporada}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/tarifas">Volver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos de tarifa</CardTitle>
        </CardHeader>
        <CardContent>
          <TarifaForm tarifa={tarifa} />
        </CardContent>
      </Card>
    </section>
  );
}
