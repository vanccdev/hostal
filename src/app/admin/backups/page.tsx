import { DatabaseBackup, ImageDown, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";

export default async function BackupsPage() {
  await requireAdminModule("backups");

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Backups</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Descargas administrativas y guías para migración completa de Supabase.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Base de datos</CardTitle>
            <CardDescription>
              Exporta tablas públicas de la aplicación en JSON. No incluye usuarios Auth ni hashes de contraseñas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/admin/backups/database" download>
                <DatabaseBackup className="h-4 w-4" aria-hidden="true" />
                Descargar JSON
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Imágenes de habitaciones</CardTitle>
            <CardDescription>
              Exporta el bucket Storage habitaciones en TAR con un manifiesto y los archivos disponibles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href="/admin/backups/imagenes" download>
                <ImageDown className="h-4 w-4" aria-hidden="true" />
                Descargar TAR
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Migración completa self-hosted</CardTitle>
          <CardDescription>
            Para llevar Auth, schemas internos, policies, buckets, metadata y archivos a otro Supabase, usa el backup
            desde terminal sobre una instancia controlada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <Terminal className="h-4 w-4" aria-hidden="true" />
              Comandos
            </div>
            <pre className="overflow-x-auto text-xs">
              <code>{`scripts/backup-supabase-local.sh
CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh backups/YYYYMMDDTHHMMSSZ`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
