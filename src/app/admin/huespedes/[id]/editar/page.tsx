import Link from "next/link";
import { notFound } from "next/navigation";
import { HuespedForm } from "@/components/forms/HuespedForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function EditarHuespedPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminModule("huespedes");
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: huesped } = await supabase
    .from("huespedes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!huesped) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Editar huésped</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{huesped.nombre_completo}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/huespedes">Volver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos de huésped</CardTitle>
        </CardHeader>
        <CardContent>
          <HuespedForm huesped={huesped} />
        </CardContent>
      </Card>
    </section>
  );
}
