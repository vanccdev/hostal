import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { getGuestForUser } from "@/lib/db/current-guest";

export default async function PerfilPage() {
  const currentUser = await requirePasswordReady();
  const guest = await getGuestForUser(currentUser.authUserId);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Perfil</h1>
        <p className="text-sm text-zinc-600">Datos asociados a tu cuenta.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{guest?.nombre_completo ?? currentUser.profile?.nombre}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <p>Email: {guest?.email ?? currentUser.email ?? "-"}</p>
          <p>Teléfono: {guest?.telefono ?? "-"}</p>
          <p>Documento: {guest?.numero_documento ?? "-"}</p>
          <p>País: {guest?.pais ?? "-"}</p>
        </CardContent>
      </Card>
    </section>
  );
}

