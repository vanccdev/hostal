import { notFound } from "next/navigation";
import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function ResetPasswordPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminModule("usuarios");
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id,nombre,rol,activo,created_at,must_change_password")
    .eq("id", id)
    .maybeSingle();

  if (!usuario || usuario.rol !== "cliente") {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Restablecer contraseña</h1>
        <p className="text-sm text-zinc-600">{usuario.nombre}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Reset a teléfono</CardTitle>
          <CardDescription>
            La nueva contraseña será el número de celular normalizado del cliente y se marcará cambio obligatorio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm userId={usuario.id} />
        </CardContent>
      </Card>
    </section>
  );
}

