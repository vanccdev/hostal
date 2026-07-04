# Sistema de Gestion de Hostal

Aplicacion Next.js con App Router para administrar un hostal conectado a Supabase self-hosted. Incluye autenticacion, portal administrativo, portal cliente, reservas, creacion de clientes por personal, restablecimiento de contrasena a telefono y base de eventos/webhooks.

## Estado Actual

Implementado:

- Autenticacion con Supabase Auth: `/login`, `/crear-cuenta`, logout y cambio obligatorio de contrasena.
- Guards server-side y `middleware.ts` para proteger `/admin` y `/app`.
- Roles desde `public.usuarios`: `admin`, `recepcionista`, `limpieza`, `cliente`.
- Clientes Supabase:
  - Browser: `src/lib/supabase/client.ts`
  - Server: `src/lib/supabase/server.ts`
  - Admin server-only: `src/lib/supabase/admin.ts`
- Server Actions:
  - `src/app/actions/auth.ts`
  - `src/app/actions/clientes.ts`
  - `src/app/actions/reservas.ts`
  - `src/app/actions/password.ts`
  - `src/app/actions/crud.ts`
- Panel admin con rutas principales bajo `/admin`.
- Backups administrativos bajo `/admin/backups`:
  - Descarga operativa de tablas publicas de la app en JSON.
  - Descarga operativa de imagenes del bucket `habitaciones` en TAR.
  - Migracion completa self-hosted mediante scripts locales con `pg_dump`, `pg_restore` y archivo TAR de Storage.
- Portal cliente con rutas principales bajo `/app`.
- CRUD inicial funcional para habitaciones, huespedes y tarifas.
- Gestion de habitaciones permite subir multiples imagenes al bucket Supabase Storage `habitaciones`; se guardan URLs en `public.img_habitaciones` y el listado muestra miniatura/conteo.
- Flujo base de reservas por cliente y por personal.
- Flujo base `createClientAccountByStaff`.
- Flujo base `resetClientPasswordToPhone`.
- Eventos internos y dispatch de webhooks sin romper la operacion principal si el webhook falla.
- Migraciones SQL iniciales en `supabase/migrations`.
- Migracion de imagenes de habitaciones:
  - `supabase/migrations/202607040001_add_img_habitaciones_storage.sql`
  - Crea bucket publico `habitaciones`.
  - Crea tabla `public.img_habitaciones` (`habitacion_id`, `url`, `created_at`) con relacion many-to-one hacia `public.habitaciones`.
  - Agrega politicas RLS para lectura autenticada y escritura de `admin`/`recepcionista`.
- Dark mode con `next-themes` siguiendo el patron oficial de shadcn/ui para Next:
  - `src/components/theme/ThemeProvider.tsx`
  - `src/components/theme/ThemeToggle.tsx`
  - `ThemeProvider` configurado con `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`.
- Dropdown menu base en `src/components/ui/dropdown-menu.tsx`.
- Navegacion responsive:
  - Portal cliente con menu movil en `src/components/app/UserNav.tsx`.
  - Admin con menu movil controlado en `src/components/admin/AdminSidebar.tsx`.
  - El menu movil admin se cierra al seleccionar una ruta.
  - El layout admin aplica grid solo desde `md` para evitar que el contenido quede visualmente centrado en movil.

Pendiente o siguiente iteracion:

- Validar nombres/tipos exactos de columnas contra la instancia Supabase local/self-hosted.
- Ajustar tipos `src/types/database.ts` usando tipos generados desde Supabase cuando el esquema real este disponible.
- Completar CRUD avanzado para transacciones, comprobantes, cancelaciones, bloqueos, estado de habitaciones, configuracion y usuarios.
- Definir estrategia de backup programado en produccion y almacenamiento externo cifrado.
- Implementar busqueda avanzada de cliente por nombre, email, telefono y documento en `/admin/reservas/nueva`.
- Implementar flujo combinado "crear cliente nuevo + crear reserva" desde `/admin/reservas/nueva`.
- Implementar edicion de perfil cliente.
- Implementar carga real de comprobantes si se usara Supabase Storage.
- Agregar administracion completa de imagenes de habitaciones existentes: borrar fotos, ordenar galeria y agregar imagenes a habitaciones ya creadas desde una vista de edicion.
- Revisar y endurecer RLS con el esquema final real.
- Agregar pruebas automatizadas cuando el backend este disponible.

## Version de Next.js

El requerimiento original pide Next.js 16.3. Actualmente `next@16.3.0` no existe en npm. El scaffold quedo con `next@16.2.10`, instalado por `create-next-app@latest`.

Cuando exista Next 16.3:

```bash
pnpm add next@16.3 eslint-config-next@16.3
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## Instalacion

```bash
pnpm install
cp .env.local.example .env.local
```

Edita `.env.local` con valores reales:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-self-hosted-anon-key

SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key-server-only
WEBHOOK_RESERVAS_URL=
WEBHOOK_PAGOS_URL=
WEBHOOK_AUTH_EVENTS_URL=
```

No colocar `SUPABASE_SERVICE_ROLE_KEY` en componentes cliente ni variables `NEXT_PUBLIC_*`.

## Supabase Local

La instancia local usada durante desarrollo esta en:

```text
http://localhost:8000
```

Supabase Studio local tambien esta detras de ese host. Las API keys reales se obtuvieron desde el endpoint interno de Studio y se guardaron en `.env.local`. No imprimir `.env.local` ni exponer `SUPABASE_SERVICE_ROLE_KEY`.

Usuario admin de desarrollo creado:

```text
email: admin@admin.com
password: 8433318
rol: admin
```

Notas de esquema:

- Se agrego en la DB local `public.usuarios.must_change_password`.
- Se aplico en la DB local `public.img_habitaciones` y el bucket publico `storage.buckets.id = 'habitaciones'`.
- `src/types/database.ts` todavia debe validarse/generarse contra el esquema real.
- En la DB local, algunas columnas de `public.huespedes` pueden ser `NOT NULL` aunque los tipos actuales las marquen opcionales.

## Desarrollo

```bash
pnpm dev
```

Abrir:

```text
http://localhost:3000
```

Si faltan variables de Supabase, la app puede mostrar error al entrar a rutas que consultan auth.

La carga de imagenes de habitaciones usa Server Actions; `next.config.ts` configura `experimental.serverActions.bodySizeLimit = "30mb"` para permitir varias imagenes de hasta 5 MB cada una.

## Backups y Migracion

Para una descarga rapida desde la app:

- `/admin/backups/database`: exporta tablas publicas de la aplicacion en JSON.
- `/admin/backups/imagenes`: exporta imagenes del bucket `habitaciones` en TAR.

Para migrar a otro Supabase self-hosted con Auth, configuraciones internas, schemas, policies, storage metadata y archivos:

```bash
scripts/backup-supabase-local.sh
CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh backups/YYYYMMDDTHHMMSSZ
```

Los scripts usan por defecto los contenedores Docker `supabase-db` y `supabase-storage`. Se pueden cambiar con:

```bash
SUPABASE_DB_CONTAINER=nombre-db SUPABASE_STORAGE_CONTAINER=nombre-storage scripts/backup-supabase-local.sh
```

Si Storage no esta montado en `/var/lib/storage`, definir:

```bash
SUPABASE_STORAGE_DIR=/ruta/storage scripts/backup-supabase-local.sh
```

## Verificacion

Comandos usados y esperados:

```bash
pnpm lint
pnpm exec tsc --noEmit
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy SUPABASE_SERVICE_ROLE_KEY=dummy pnpm build
```

Notas:

- `pnpm lint` pasa.
- `pnpm exec tsc --noEmit` pasa.
- `pnpm build` pasa con variables dummy.
- En este entorno, `pnpm build` requirio ejecutarse fuera del sandbox porque Turbopack intento crear procesos internos.

Verificaciones recientes:

- `pnpm lint` pasa.
- `pnpm exec tsc --noEmit` pasa.
- Supabase local verificado con Docker: existen tabla `public.img_habitaciones`, bucket `habitaciones` y politicas RLS para `storage.objects`.
- `/admin/backups` responde protegido con redirect a `/login` sin sesion; endpoints `/admin/backups/database` y `/admin/backups/imagenes` devuelven `401` sin sesion.
- `/admin/habitaciones` responde protegido con redirect a `/login` sin sesion; `/login` responde `200`.
- `/admin/usuarios` fue medido en viewport movil `390x844` con Chrome headless:
  - Antes del fix: `aside height = 291`, `main top = 291`.
  - Despues del fix: `aside height = 57`, `main top = 57`, `section top = 81`.
  - El fix fue cambiar `src/app/admin/layout.tsx` a `min-h-screen md:grid md:grid-cols-[260px_1fr]`.

## Migraciones

Archivos:

- `supabase/migrations/202607030001_add_must_change_password.sql`
- `supabase/migrations/202607030002_rls_base_policies.sql`
- `supabase/migrations/202607040001_add_img_habitaciones_storage.sql`

La primera migracion agrega:

```sql
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false NOT NULL;
```

La segunda habilita RLS y propone politicas base. Debe revisarse contra el esquema real antes de produccion, especialmente tablas secundarias como `transacciones`, `comprobantes` y `cancelaciones`.

La tercera crea el bucket publico `habitaciones`, la tabla `public.img_habitaciones`, indices y politicas para lectura autenticada y gestion por `admin`/`recepcionista`.

## Flujos Para Probar

1. Registro cliente:
   - Ir a `/crear-cuenta`.
   - Crear cuenta con nombre, email, password y datos opcionales.
   - Debe crear `auth.users`, `public.usuarios` con rol `cliente` y `public.huespedes`.

2. Login:
   - Ir a `/login`.
   - Redireccion esperada:
     - `admin`, `recepcionista`, `limpieza` -> `/admin`
     - `cliente` -> `/app`

3. Cliente crea reserva:
   - Login como cliente.
   - Ir a `/app/reservas/nueva`.
   - Seleccionar habitacion, tarifa opcional y fechas.
   - La reserva debe asociarse al huesped de `auth.uid()`.

4. Staff crea cliente:
   - Login como `admin` o `recepcionista`.
   - Ir a `/admin/clientes/nuevo`.
   - Crear cliente con telefono obligatorio.
   - Password inicial = telefono normalizado.
   - `must_change_password = true`.

5. Staff crea reserva:
   - Ir a `/admin/reservas/nueva`.
   - Seleccionar huesped existente, habitacion y fechas.
   - No debe duplicar `auth.users` ni `huespedes`.

6. Reset password:
   - Ir a `/admin/usuarios`.
   - Seleccionar reset de un cliente.
   - Confirmar en `/admin/usuarios/[id]/reset-password`.
   - Password nueva = telefono normalizado.
   - `must_change_password = true`.

7. Staff crea habitacion con imagenes:
   - Login como `admin` o `recepcionista`.
   - Ir a `/admin/habitaciones`.
   - Crear habitacion y seleccionar una o varias imagenes JPG, PNG, WEBP o GIF.
   - Cada imagen debe pesar 5 MB o menos.
   - Debe subir archivos a Storage bucket `habitaciones`, guardar URLs en `public.img_habitaciones` y mostrar miniatura/conteo en el listado.

## Seguridad

- No usar `SUPABASE_SERVICE_ROLE_KEY` en frontend.
- Operaciones administrativas usan `createSupabaseAdminClient()` solo en servidor.
- La subida de imagenes de habitaciones usa `SUPABASE_SERVICE_ROLE_KEY` solo en Server Action (`src/app/actions/crud.ts`), nunca en componentes cliente.
- Los backups operativos de la app usan `SUPABASE_SERVICE_ROLE_KEY` solo del lado servidor en `src/lib/backups.ts`; no exportan `auth.users` ni hashes de contrasenas.
- Los scripts de migracion completa usan `pg_dump` sobre el contenedor DB y TAR del directorio Storage; deben ejecutarse solo en infraestructura controlada.
- Toda accion critica valida sesion y rol server-side.
- El rol se consulta desde `public.usuarios`, no solo desde JWT.
- Cliente solo debe acceder a datos propios.
- Limpieza no debe acceder a huespedes, pagos, usuarios ni datos sensibles.
- Los webhooks no deben enviar contrasenas completas por defecto.

## Guia Para Continuar

Antes de seguir desarrollando:

1. Leer este README completo.
2. Leer `AGENTS.md`.
3. Revisar `git status --short`.
4. Confirmar que `.env.local` existe con variables reales.
5. Ejecutar:

```bash
pnpm lint
pnpm exec tsc --noEmit
```

Siguiente paso recomendado:

1. Generar tipos desde el esquema real/local.
2. Ajustar `src/types/database.ts`.
3. Probar auth y registros contra self-hosted.
4. Probar subida real de imagenes desde `/admin/habitaciones` con una sesion `admin`.
5. Cargar datos base para habitaciones/tarifas.
6. Completar los CRUD secundarios y el flujo combinado de reserva admin con cliente nuevo.
