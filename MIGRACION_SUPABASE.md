# Migracion de Supabase y la app a otra PC o VPS

Esta guia sirve para llevar el proyecto del hostal a otra maquina conservando el estado actual de Supabase: base de datos, Auth, tablas, policies, metadata y archivos de Storage.

## Que se debe copiar

Para que el sistema corra igual en otra PC/VPS necesitas estas piezas:

1. El codigo de este proyecto Next.js.
2. El backup completo generado con `scripts/backup-supabase-local.sh`.
3. Los archivos de configuracion y secretos:
   - `.env.local` de la app Next.js.
   - `.env` o archivos equivalentes de la instalacion Supabase self-hosted.

No subas esos `.env` a Git. Copialos por un canal seguro.

## Backup ya generado

El backup completo actual quedo en:

```bash
backups/20260717T142233Z
```

Debe contener:

```text
database.dump
storage.tar
manifest.txt
```

`database.dump` contiene la base PostgreSQL completa. `storage.tar` contiene los archivos de Supabase Storage.

## Crear un backup nuevo

En la maquina actual, con los contenedores de Supabase encendidos:

```bash
scripts/backup-supabase-local.sh
```

Si los contenedores tienen otros nombres:

```bash
SUPABASE_DB_CONTAINER=nombre-db \
SUPABASE_STORAGE_CONTAINER=nombre-storage \
scripts/backup-supabase-local.sh
```

El script crea una carpeta como:

```bash
backups/YYYYMMDDTHHMMSSZ
```

## Empaquetar para copiar a otra maquina

Desde la raiz del proyecto:

```bash
tar -czf hostal-backup-20260717.tar.gz backups/20260717T142233Z
```

Copia ese archivo a la otra PC/VPS junto con el codigo del proyecto y los `.env` necesarios.

Ejemplo con `scp`:

```bash
scp hostal-backup-20260717.tar.gz usuario@servidor:/ruta/destino/
```

## Preparar la otra PC/VPS

Instala los requisitos:

- Docker y Docker Compose.
- Node.js compatible con el proyecto.
- `pnpm`.
- Supabase self-hosted con una configuracion equivalente.

Luego copia o clona el proyecto en la maquina destino.

Instala dependencias de la app:

```bash
pnpm install
```

Copia el `.env.local` de la app a la raiz del proyecto.

Tambien copia los `.env` o secretos de Supabase self-hosted a la instalacion Supabase de la maquina destino.

## Levantar Supabase destino

Arranca Supabase self-hosted en la maquina destino.

Verifica que los contenedores existan:

```bash
docker ps
```

Los scripts esperan por defecto estos nombres:

```text
supabase-db
supabase-storage
```

Tambien usan por defecto el rol PostgreSQL `supabase_admin`, porque en la imagen self-hosted de Supabase el rol
`postgres` puede no ser superuser. Si tu instalacion usa otros nombres, usa variables de entorno al respaldar o restaurar.

## Restaurar el backup

Descomprime el backup:

```bash
tar -xzf hostal-backup-20260717.tar.gz
```

Restaura base de datos y Storage:

```bash
CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh backups/20260717T142233Z
```

El script filtra privilegios por defecto y event triggers internos de Supabase que pueden fallar con errores como:

```text
must be member of role "supabase_admin"
Non-superuser owned event trigger must execute a non-superuser owned function
```

Esos errores aparecen cuando `pg_restore` intenta recrear objetos internos que ya maneja la imagen de Supabase. Usa el
script actualizado en vez de ejecutar `pg_restore` manualmente.

Si los contenedores tienen otros nombres:

```bash
SUPABASE_DB_CONTAINER=nombre-db \
SUPABASE_STORAGE_CONTAINER=nombre-storage \
CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh backups/20260717T142233Z
```

Si necesitas cambiar el rol de base de datos:

```bash
SUPABASE_DB_USER=supabase_admin \
CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh backups/20260717T142233Z
```

Storage se respalda y restaura desde el contenedor `supabase-storage`, usando `/var/lib/storage`. Durante restore, el
contenido actual del Storage destino se limpia antes de extraer `storage.tar`.

En esta instalacion local la ruta fisica correcta incluye `stub/stub`, por ejemplo
`/var/lib/storage/stub/stub/habitaciones/...`. No aplanes esa carpeta. El script de restore recompone automaticamente los
xattrs `user.supabase.cache-control` y `user.supabase.content-type`, requeridos por Supabase Storage para servir imagenes
y PDFs restaurados desde TAR.

## Advertencia sobre restore

El restore reemplaza el estado de la base destino usando `pg_restore --clean --if-exists`.

No ejecutes restore sobre una base con datos que quieras conservar. Primero haz backup de la maquina destino si ya tiene informacion.

## Levantar la app

Con Supabase corriendo y `.env.local` configurado:

```bash
pnpm dev
```

Para produccion:

```bash
pnpm build
pnpm start
```

## Verificaciones despues de restaurar

Revisa:

1. Que la app abra correctamente.
2. Que puedas iniciar sesion con el admin.
3. Que `/admin` cargue.
4. Que las habitaciones, tarifas, reservas y huespedes aparezcan.
5. Que las imagenes de habitaciones se vean desde Storage.
6. Que `/admin/backups` siga protegido y accesible solo para `admin`.

Tambien ejecuta:

```bash
pnpm lint
pnpm exec tsc --noEmit
```

## Diferencia entre backup web y backup completo

El apartado web `/admin/backups` sirve para descargas operativas:

- JSON de tablas publicas de la app.
- TAR del bucket `habitaciones`.

Ese backup web no es suficiente para clonar Supabase completo.

Para migrar a otra PC/VPS usa:

```bash
scripts/backup-supabase-local.sh
CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh backups/YYYYMMDDTHHMMSSZ
```

## Archivos que no deben subirse a Git

No subir:

```text
.env
.env.local
backups/
*.dump
storage.tar
```

El proyecto ya ignora `.env*` y `backups/` en `.gitignore`.
