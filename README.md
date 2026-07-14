# Sistema de Gestion de Hostal

Aplicacion Next.js con App Router para administrar un hostal conectado a Supabase self-hosted. Incluye autenticacion, portal administrativo, portal cliente, reservas, creacion de clientes por personal, restablecimiento de contrasena a telefono y base de eventos/webhooks.

## Estado Actual

Implementado:

- Autenticacion con Supabase Auth: `/login`, `/crear-cuenta`, logout hacia `/` y cambio obligatorio de contrasena.
- Guards server-side y `middleware.ts` para proteger `/admin` y `/app`.
- Home publica en `/` con catalogo de habitaciones, fotos, tarifas y disponibilidad sin requerir sesion.
- Flujo publico de reserva:
  - El visitante elige fechas y habitacion en `/`.
  - Al confirmar, se guarda la intencion en `sessionStorage` con clave `hostal.pendingReservation`.
  - Se redirige a `/login?next=/app/reservas/nueva` o `/crear-cuenta?next=/app/reservas/nueva`.
  - Despues de login/registro, `/app/reservas/nueva` restaura habitacion y fechas sin perder lo llenado.
  - La creacion real de reserva sigue protegida bajo `/app`.
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
- Edicion de registros para CRUD principales:
  - Habitaciones: `/admin/habitaciones/[id]/editar`
  - Huespedes: `/admin/huespedes/[id]/editar`
  - Tarifas: `/admin/tarifas/[id]/editar`
  - Los listados principales editan registros desde dialogs shadcn sin cambiar de pagina.
- Gestion de habitaciones permite subir multiples imagenes al bucket Supabase Storage `habitaciones`; se guardan URLs en `public.img_habitaciones` y el listado muestra miniatura/conteo.
  - El formulario incluye una zona para arrastrar imagenes; la subida sigue ejecutandose por Server Action.
- Tarifas asociadas a habitaciones:
  - `public.habitaciones.tarifa_id` apunta a `public.tarifas.id`, permitiendo que una tarifa se use en varias habitaciones.
  - `public.tarifas.habitacion_id` fue eliminado; no se debe reintroducir.
  - El CRUD de tarifas se administra en `/admin/tarifas`.
  - Al crear/editar habitacion se selecciona una tarifa existente para asociarla.
  - Si no hay tarifas disponibles, el formulario de habitacion muestra acceso a `/admin/tarifas`.
  - Al crear/editar tarifa desde `/admin/tarifas`, se define tipo, temporada, vigencia, precio, peso y estado; la asociacion se hace desde habitaciones.
  - `public.tarifas.peso` permite valores `0`, `1`, `2`, `3` para resolver prioridades cuando hay tarifas solapadas.
  - Si varias tarifas activas del mismo tipo estan vigentes para la fecha actual, gana la de mayor peso; si empata, gana la vigencia mas reciente y luego la creada mas recientemente.
  - Supabase impide duplicar tarifas activas con el mismo `habitacion_tipo + temporada + peso` mediante un indice unico parcial.
  - Next valida esa misma regla en `upsertTarifaAction` para mostrar un mensaje claro antes de guardar.
  - Al reservar no se elige tarifa manualmente; la tarifa actual se deriva por fecha local actual (`America/La_Paz`), tipo de habitacion, vigencia y peso.
  - El servidor valida que el `tarifa_id` recibido sea la tarifa vigente/prioritaria antes de insertar la reserva.
  - Habitaciones inactivas no se pueden seleccionar en los flujos de reserva.
- Zona horaria y formato de fechas:
  - Supabase local esta configurado en `America/La_Paz`.
  - El frontend usa `src/lib/datetime.ts` para generar fechas locales y formatear fechas/timestamps.
  - Las tablas ya no muestran timestamps crudos como `2026-07-04T01:36:21.337562`; se muestran formateados en `es-BO`.
- Tablas/listados administrativos:
  - El componente base de tabla evita saltos de linea en headers y celdas.
  - Las tablas usan scroll horizontal para mostrar contenido completo.
  - `src/components/crud/table-columns.tsx` centraliza columnas del esquema real/local y formateo.
  - Listados principales y genericos muestran todas las columnas SQL disponibles mediante `select("*")` donde aplica.
  - Las tablas usan paginacion server-side contra Supabase, no paginacion solo en cliente:
    - `select("*", { count: "exact" })`
    - `.range(from, to)`
    - `.order(...)`
    - `.ilike(...)` o `.or(...)` para busqueda por columna o global.
  - `src/lib/table-server.ts` centraliza query params (`page`, `pageSize`, `q`, `qColumn`, `sort`, `dir`), columnas buscables/ordenables y estado de paginacion.
  - `src/components/crud/DataTable.tsx` mantiene el wrapper server-side para renderizar celdas con `render(row)`.
  - `src/components/crud/ClientDataTable.tsx` implementa la UI interactiva basada en TanStack Table/shadcn: busqueda, selector de columna, orden, visibilidad de columnas, filas por pagina y navegacion.
- Flujo de reservas por cliente y por personal con presentacion visual tipo catalogo:
  - Tarjetas de habitaciones con imagen, capacidad, piso, tarifa por noche, estado y mini disponibilidad de 7 dias.
  - Panel de resumen con fechas, noches, tarifa y total.
  - Fechas pasadas bloqueadas en UI y validadas en servidor.
  - Habitaciones ocupadas o bloqueadas no se pueden reservar para el rango elegido.
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
- Paleta global actualizada con colores derivados del icono oficial del hostal.
- Home publica mejorada con marca visual, mapa OpenLayers del Hostal Plaza en Camargo, link a Google Maps, galeria/carrusel e imagenes de `public/dentro-hostal` y `public/en-camargo`.
- Dropdown menu base en `src/components/ui/dropdown-menu.tsx`.
- Select base shadcn/Radix en `src/components/ui/select.tsx`; los formularios no usan `<select>` nativo.
- Calendar base en `src/components/ui/calendar.tsx` y date picker reusable en `src/components/forms/DatePickerField.tsx`; los formularios no usan `Input type="date"`.
- Dialog, Switch, Carousel y Sonner base shadcn estan disponibles para edicion modal, estados booleanos, galerias y notificaciones.
- `src/components/forms/ActionToast.tsx` conecta respuestas `ActionState` de Server Actions con Sonner para mostrar exitos, errores generales y validaciones.
- Catalogo publico de reserva en `src/components/public/PublicBookingCatalog.tsx`.
- Clave compartida para intenciones de reserva en `src/lib/reservation-intent.ts`.
- Navegacion responsive:
  - Portal cliente con menu movil en `src/components/app/UserNav.tsx`.
  - Admin con menu movil controlado en `src/components/admin/AdminSidebar.tsx`.
  - El menu movil admin se cierra al seleccionar una ruta.
  - El layout admin aplica grid solo desde `md` para evitar que el contenido quede visualmente centrado en movil.

Pendiente o siguiente iteracion:

- Seguir validando nombres/tipos exactos de columnas contra la instancia Supabase local/self-hosted.
- Comparar `src/types/database.ts` con tipos generados desde Supabase cuando el CLI este disponible.
- Completar CRUD avanzado para transacciones, comprobantes, cancelaciones, bloqueos, estado de habitaciones, configuracion y usuarios.
- Definir estrategia de backup programado en produccion y almacenamiento externo cifrado.
- Implementar busqueda avanzada de cliente por nombre, email, telefono y documento en `/admin/reservas/nueva`.
- Implementar flujo combinado "crear cliente nuevo + crear reserva" desde `/admin/reservas/nueva`.
- Implementar edicion de perfil cliente.
- Implementar carga real de comprobantes si se usara Supabase Storage.
- Agregar administracion completa de imagenes de habitaciones existentes: borrar fotos, ordenar galeria y agregar imagenes a habitaciones ya creadas desde una vista de edicion.
- Agregar eliminacion/desactivacion controlada en CRUD principales.
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
- Se aplico historicamente `public.tarifas.habitacion_id` mediante `supabase/migrations/202607040002_add_tarifa_habitacion_id.sql`, pero luego fue reemplazado.
- La relacion vigente es `public.habitaciones.tarifa_id`; `public.tarifas.habitacion_id` fue eliminado por `supabase/migrations/202607090003_drop_tarifas_habitacion_id.sql`.
- `public.tarifas.peso` fue agregado por `supabase/migrations/202607120001_add_tarifas_peso.sql`; tiene constraint `0..3`, indices de prioridad/vigencia y un indice unico parcial para evitar repetir `habitacion_tipo + temporada + peso` en tarifas activas.
- La DB local usa timezone `America/La_Paz`; `supabase-rest` fue reiniciado despues del cambio de schema/timezone.
- `src/types/database.ts` todavia debe validarse/generarse contra el esquema real.
- En la DB local, `public.huespedes.tipo_documento` y `public.huespedes.numero_documento` son `NOT NULL`; los tipos locales ya reflejan ese comportamiento.

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
- Tablas/listados actualizados para usar paginacion server-side con Supabase y UI de busqueda/orden/columnas/filas por pagina.
- Supabase local verificado: `public.tarifas` ya no tiene `habitacion_id`; `public.habitaciones` tiene `tarifa_id`.
- Supabase local verificado: `public.tarifas` tiene `peso smallint NOT NULL DEFAULT 0`, constraint `tarifas_peso_check` e indice unico parcial `tarifas_tipo_temporada_peso_activa_uidx`.
- Supabase local verificado: `current_setting('TimeZone') = America/La_Paz`.
- `supabase-rest` fue reiniciado tras eliminar `tarifas.habitacion_id`, tras configurar timezone y tras agregar/validar `tarifas.peso`.
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
- `supabase/migrations/202607040002_add_tarifa_habitacion_id.sql`
- `supabase/migrations/202607090001_add_habitacion_tarifa_id.sql`
- `supabase/migrations/202607090002_set_lapaz_timezone.sql`
- `supabase/migrations/202607090003_drop_tarifas_habitacion_id.sql`
- `supabase/migrations/202607120001_add_tarifas_peso.sql`

La primera migracion agrega:

```sql
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false NOT NULL;
```

La segunda habilita RLS y propone politicas base. Debe revisarse contra el esquema real antes de produccion, especialmente tablas secundarias como `transacciones`, `comprobantes` y `cancelaciones`.

La tercera crea el bucket publico `habitaciones`, la tabla `public.img_habitaciones`, indices y politicas para lectura autenticada y gestion por `admin`/`recepcionista`.

La cuarta fue una migracion intermedia que agrego `public.tarifas.habitacion_id`; queda historica y fue reemplazada por el modelo vigente.

La quinta agrega `public.habitaciones.tarifa_id`, migra asignaciones antiguas desde `tarifas.habitacion_id` cuando existan y crea `habitaciones_tarifa_id_idx`.

La sexta configura la zona horaria local de Postgres/Supabase en `America/La_Paz`.

La septima elimina `public.tarifas.habitacion_id` y recarga el schema cache de PostgREST.

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

3. Cliente crea reserva desde home publica:
   - Ir a `/` sin sesion.
   - Seleccionar fechas y una habitacion disponible.
   - Pulsar reservar.
   - Debe redirigir a `/login?next=/app/reservas/nueva` o permitir ir a `/crear-cuenta?next=/app/reservas/nueva`.
   - Tras login/registro, `/app/reservas/nueva` debe restaurar fechas y habitacion.
   - Confirmar reserva; la tarifa se deriva de la habitacion y la reserva se asocia al huesped de `auth.uid()`.

4. Staff crea cliente:
   - Login como `admin` o `recepcionista`.
   - Ir a `/admin/clientes/nuevo`.
   - Crear cliente con telefono obligatorio.
   - Password inicial = telefono normalizado.
   - `must_change_password = true`.

5. Staff crea reserva:
   - Ir a `/admin/reservas/nueva`.
   - Seleccionar huesped, fechas y habitacion desde tarjetas visuales.
   - No seleccionar tarifa manualmente; debe derivarse de la habitacion.
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
   - Crear habitacion, seleccionar una tarifa existente y seleccionar una o varias imagenes JPG, PNG, WEBP o GIF.
   - Cada imagen debe pesar 5 MB o menos.
   - Debe asociar la tarifa seleccionada actualizando `public.habitaciones.tarifa_id`.
   - Debe subir archivos a Storage bucket `habitaciones`, guardar URLs en `public.img_habitaciones` y mostrar miniatura/conteo en el listado.

8. Staff edita CRUD principales:
   - Ir a `/admin/habitaciones`, `/admin/huespedes` o `/admin/tarifas`.
   - Usar el boton `Editar` del listado.
   - Guardar cambios desde la ruta `/editar`.
   - Debe actualizar el registro existente sin crear duplicados.

9. Tablas con paginacion server-side:
   - Ir a listados como `/admin/usuarios`, `/admin/habitaciones`, `/admin/huespedes`, `/admin/tarifas`, `/admin/reservas`, `/admin/auditoria` o modulos genericos.
   - Cambiar filas por pagina y navegar paginas; debe actualizar query params y consultar Supabase con `range`.
   - Buscar en todas las columnas o una columna especifica; debe resetear a pagina 1 y consultar Supabase con filtros.
   - Ordenar desde encabezados; debe actualizar `sort`/`dir` y consultar Supabase.

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

1. Generar tipos desde el esquema real/local si se instala Supabase CLI y comparar con `src/types/database.ts`.
2. Probar auth y registros contra self-hosted.
3. Probar subida real de imagenes desde `/admin/habitaciones` con una sesion `admin`.
4. Cargar datos base para habitaciones/tarifas.
5. Probar tablas con volumen suficiente para validar paginacion/busqueda/orden server-side.
6. Completar los CRUD secundarios y el flujo combinado de reserva admin con cliente nuevo.
