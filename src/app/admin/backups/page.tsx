import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  DatabaseBackup,
  FileArchive,
  HardDriveDownload,
  ImageDown,
  KeyRound,
  Server,
  Terminal,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";

const migrationSteps = [
  {
    title: "Crear backup completo donde corre Supabase",
    description:
      "Ejecuta el script en la PC o VPS donde estan los contenedores Docker de Supabase, no necesariamente donde abres el navegador.",
    command: "cd /ruta/del/proyecto/hostal\ndocker ps\nscripts/backup-supabase-local.sh",
  },
  {
    title: "Empaquetar el backup para copiarlo",
    description: "Reemplaza la carpeta por la que genero el script, por ejemplo backups/20260717T142233Z.",
    command: "tar -czf hostal-backup.tar.gz backups/YYYYMMDDTHHMMSSZ",
  },
  {
    title: "Copiar proyecto, backup y secretos",
    description:
      "Lleva el codigo, el archivo hostal-backup.tar.gz, .env.local de Next.js y los .env de Supabase self-hosted.",
    command: "scp hostal-backup.tar.gz usuario@servidor:/ruta/destino/",
  },
  {
    title: "Preparar la otra PC o VPS",
    description: "Instala Docker, Node.js y pnpm. Luego levanta Supabase self-hosted con la misma configuracion.",
    command: "pnpm install\ndocker ps",
  },
  {
    title: "Restaurar base de datos y Storage",
    description:
      "Este paso reemplaza la base destino. Usalo solo cuando la instancia destino ya pueda perder su estado actual.",
    command: "tar -xzf hostal-backup.tar.gz\nCONFIRM_RESTORE=YES scripts/restore-supabase-local.sh backups/YYYYMMDDTHHMMSSZ",
  },
  {
    title: "Probar la app restaurada",
    description: "Arranca Next.js y verifica login admin, habitaciones, tarifas, reservas e imagenes.",
    command: "pnpm dev\npnpm lint\npnpm exec tsc --noEmit",
  },
] as const;

const requiredPieces = [
  {
    icon: Archive,
    title: "Backup completo",
    text: "Carpeta backups/YYYYMMDDTHHMMSSZ con database.dump, storage.tar y manifest.txt.",
  },
  {
    icon: KeyRound,
    title: "Secretos",
    text: ".env.local de la app y .env de Supabase self-hosted copiados por un canal seguro.",
  },
  {
    icon: Server,
    title: "Servidor destino",
    text: "Docker, Supabase self-hosted, Node.js y pnpm instalados antes de restaurar.",
  },
] as const;

const executionPlaces = [
  {
    title: "Si trabajas en tu PC local",
    text: "Abre otra terminal en la raiz del proyecto y ejecuta el script ahi. No uses la terminal ocupada por pnpm dev.",
    command: "cd /home/van/Desarrollo/Frontend/hostal\nscripts/backup-supabase-local.sh",
  },
  {
    title: "Si la app ya esta en un VPS",
    text: "Conectate por SSH al VPS y ejecuta el script en ese servidor, siempre que Supabase Docker tambien corra ahi.",
    command: "ssh usuario@IP_DEL_VPS\ncd /ruta/del/proyecto/hostal\nscripts/backup-supabase-local.sh",
  },
  {
    title: "Si Next.js y Supabase estan separados",
    text: "Ejecuta el script en la maquina donde vive Supabase. El backup depende de los contenedores supabase-db y supabase-storage.",
    command: "docker ps --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}'",
  },
] as const;

export default async function BackupsPage() {
  await requireAdminModule("backups");

  return (
    <section className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold">Backups</h1>
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
          Descargas administrativas y guia para llevar Supabase a otra PC o VPS.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="mb-2 h-4 w-4 text-[#9b6b12]" aria-hidden="true" />
        <AlertTitle>Hay dos tipos de backup</AlertTitle>
        <AlertDescription>
          Los botones web sirven para una descarga operativa de tablas publicas e imagenes. Para clonar Supabase completo
          con Auth, policies, metadata, buckets y archivos, usa los scripts de terminal.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle>Base de datos operativa</CardTitle>
              <Badge variant="secondary">Web</Badge>
            </div>
            <CardDescription>
              Exporta tablas publicas de la aplicacion en JSON. No incluye usuarios Auth, hashes, schemas internos ni
              configuracion completa de Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild>
              <a href="/admin/backups/database" download>
                <DatabaseBackup className="h-4 w-4" aria-hidden="true" />
                Descargar JSON
              </a>
            </Button>
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
              Util para revisar o guardar datos de la app. No lo uses como unico respaldo para migrar de servidor.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle>Imagenes de habitaciones</CardTitle>
              <Badge variant="secondary">Web</Badge>
            </div>
            <CardDescription>
              Exporta el bucket Storage habitaciones en TAR con un manifiesto y los archivos disponibles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild variant="outline">
              <a href="/admin/backups/imagenes" download>
                <ImageDown className="h-4 w-4" aria-hidden="true" />
                Descargar TAR
              </a>
            </Button>
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
              Util para copiar solo las fotos del bucket habitaciones. El backup completo incluye todo Storage.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle>Imagenes de Comprobantes</CardTitle>
              <Badge variant="secondary">Web</Badge>
            </div>
            <CardDescription>
              Exporta el bucket Storage comprobante en TAR con manifiesto, imagenes y PDFs subidos por clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild variant="outline">
              <a href="/admin/backups/comprobantes" download>
                <FileArchive className="h-4 w-4" aria-hidden="true" />
                Descargar TAR
              </a>
            </Button>
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
              Util para guardar comprobantes sin descargar todo Supabase. El backup completo tambien incluye este bucket.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <HardDriveDownload className="h-5 w-5 text-[#9b6b12]" aria-hidden="true" />
            <CardTitle>Migracion completa self-hosted</CardTitle>
            <Badge>Recomendado para VPS</Badge>
          </div>
          <CardDescription>
            Este es el proceso para llevar el estado actual de Supabase a otra PC o VPS y hacerlo correr igual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            {requiredPieces.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-lg border border-[#d8d4c8] bg-[#fbf8ef] p-4 dark:border-[#314237] dark:bg-[#1d2c23]"
                >
                  <Icon className="mb-3 h-5 w-5 text-[#9b6b12]" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-[#66736a] dark:text-[#b7c0b4]">{item.text}</p>
                </div>
              );
            })}
          </div>

          <Alert className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <AlertTitle>Restaurar reemplaza la base destino</AlertTitle>
            <AlertDescription>
              El comando de restore usa limpieza previa de objetos. Si la otra PC/VPS ya tiene datos importantes, primero
              crea un backup de esa maquina.
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertTitle>Errores internos de Supabase durante restore</AlertTitle>
            <AlertDescription>
              Si viste mensajes como <code>must be member of role supabase_admin</code> o errores de event triggers, no
              significa que el backup este dañado. El script filtra privilegios y triggers internos que la imagen de
              Supabase ya administra.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold">Donde ejecuto el backup</h3>
              <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
                Ejecuta `scripts/backup-supabase-local.sh` en la maquina donde corre Supabase self-hosted con Docker. Si
                Next.js y Supabase estan en el mismo VPS, se ejecuta desde la raiz del proyecto en ese VPS.
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {executionPlaces.map((place) => (
                <div key={place.title} className="rounded-lg border border-[#d8d4c8] p-4 dark:border-[#314237]">
                  <h4 className="text-sm font-semibold">{place.title}</h4>
                  <p className="mt-2 text-sm text-[#66736a] dark:text-[#b7c0b4]">{place.text}</p>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-[#f6f1e6] p-3 text-xs dark:bg-[#1d2c23]">
                    <code>{place.command}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {migrationSteps.map((step, index) => (
              <div
                key={step.title}
                className="grid gap-3 rounded-lg border border-[#d8d4c8] p-4 dark:border-[#314237] lg:grid-cols-[240px_1fr]"
              >
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c7a35a] text-sm font-semibold text-[#102317]">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-semibold">{step.title}</h3>
                  </div>
                  <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">{step.description}</p>
                </div>
                <pre className="overflow-x-auto rounded-lg border border-[#d8d4c8] bg-[#102317] p-4 text-xs text-[#f8f1df] dark:border-[#314237]">
                  <code>{step.command}</code>
                </pre>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-[#d8d4c8] p-4 dark:border-[#314237]">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <Terminal className="h-4 w-4" aria-hidden="true" />
                Contenedores con nombres diferentes
              </div>
              <p className="mb-3 text-sm text-[#66736a] dark:text-[#b7c0b4]">
                Los scripts usan por defecto supabase-db, supabase-storage y el rol supabase_admin. Si tu instalacion usa
                otros nombres:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-[#f6f1e6] p-3 text-xs dark:bg-[#1d2c23]">
                <code>{`SUPABASE_DB_CONTAINER=nombre-db \\
SUPABASE_STORAGE_CONTAINER=nombre-storage \\
SUPABASE_DB_USER=supabase_admin \\
CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh backups/YYYYMMDDTHHMMSSZ`}</code>
              </pre>
            </div>

            <div className="rounded-lg border border-[#d8d4c8] p-4 dark:border-[#314237]">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <FileArchive className="h-4 w-4" aria-hidden="true" />
                Storage desde el contenedor
              </div>
              <p className="mb-3 text-sm text-[#66736a] dark:text-[#b7c0b4]">
                El restore copia storage.tar al contenedor supabase-storage, limpia /var/lib/storage y extrae ahi el
                backup para evitar problemas de permisos del host. Tambien recompone los xattrs que Storage necesita
                para servir imagenes y PDFs.
              </p>
              <pre className="overflow-x-auto rounded-lg bg-[#f6f1e6] p-3 text-xs dark:bg-[#1d2c23]">
                <code>{`docker exec supabase-storage ls -la /var/lib/storage
CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh backups/YYYYMMDDTHHMMSSZ`}</code>
              </pre>
            </div>
          </div>

          <div className="rounded-lg border border-[#d8d4c8] bg-[#fbf8ef] p-4 dark:border-[#314237] dark:bg-[#1d2c23]">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
              Verificacion final
            </div>
            <ul className="grid gap-2 text-sm text-[#66736a] dark:text-[#b7c0b4] md:grid-cols-2">
              <li>Iniciar sesion con el admin.</li>
              <li>Entrar a /admin sin errores.</li>
              <li>Ver habitaciones, tarifas y reservas.</li>
              <li>Confirmar que las imagenes cargan desde Storage.</li>
              <li>Ejecutar pnpm lint.</li>
              <li>Ejecutar pnpm exec tsc --noEmit.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
