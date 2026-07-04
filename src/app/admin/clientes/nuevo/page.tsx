import { ClienteStaffForm } from "@/components/forms/ClienteStaffForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";

export default async function NuevoClientePage() {
  await requireAdminModule("clientes");

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Crear cliente</h1>
        <p className="text-sm text-zinc-600">Crea Auth, perfil y huésped con contraseña inicial igual al teléfono.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos del cliente</CardTitle>
          <CardDescription>No se enviará contraseña por correo.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClienteStaffForm />
        </CardContent>
      </Card>
    </section>
  );
}

