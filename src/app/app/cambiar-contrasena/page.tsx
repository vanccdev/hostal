import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-role";

export default async function CambiarContrasenaPage() {
  await requireRole(["cliente"]);

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cambiar contraseña</h1>
        <p className="text-sm text-zinc-600">Debes completar este cambio para usar el portal.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nueva contraseña</CardTitle>
          <CardDescription>La contraseña inicial del teléfono dejará de estar activa.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </section>
  );
}

