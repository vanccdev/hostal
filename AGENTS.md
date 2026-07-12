<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Continuidad del Proyecto

Este proyecto es un sistema de gestion de hostal en Next.js App Router, TypeScript y Supabase self-hosted.

Antes de continuar cualquier tarea:

1. Leer `README.md`.
2. Revisar `git status --short`.
3. No leer ni imprimir `.env` o `.env.local` salvo que el usuario lo pida explicitamente.
4. No exponer `SUPABASE_SERVICE_ROLE_KEY` en componentes cliente ni en logs.
5. Usar siempre `pnpm`.
6. Ejecutar `pnpm lint` y `pnpm exec tsc --noEmit` antes de entregar cambios relevantes.

## Estado en que quedo

Ya existe una base funcional con:

- Auth por Supabase en `/login` y `/crear-cuenta`; logout redirige a `/`.
- Middleware y guards server-side.
- Redireccion por rol desde `public.usuarios`.
- Home publica en `/`:
  - Muestra catalogo de habitaciones sin iniciar sesion.
  - Usa fotos de `public.img_habitaciones`, tarifas activas, reservas activas y bloqueos para mostrar disponibilidad.
  - Mantiene boton de iniciar sesion visible.
  - Al intentar reservar, guarda la intencion en `sessionStorage` con clave `hostal.pendingReservation` y redirige a login/registro con `next=/app/reservas/nueva`.
  - Tras login/registro, `src/components/forms/ReservaForm.tsx` restaura habitacion y fechas desde esa intencion.
- Panel admin bajo `/admin`.
- Backups administrativos bajo `/admin/backups`:
  - Backup operativo JSON de tablas publicas de la app en `/admin/backups/database`.
  - Backup operativo TAR de imagenes del bucket `habitaciones` en `/admin/backups/imagenes`.
  - Migracion completa self-hosted mediante `scripts/backup-supabase-local.sh` y `scripts/restore-supabase-local.sh`.
  - Implementacion server-only en `src/lib/backups.ts`.
  - Solo rol `admin`; los endpoints de app no exportan `auth.users` ni hashes de contrasenas.
- Portal cliente bajo `/app`.
- CRUD inicial de habitaciones, huespedes y tarifas.
- Edicion implementada para CRUD principales:
  - Habitaciones: `/admin/habitaciones/[id]/editar`.
  - Huespedes: `/admin/huespedes/[id]/editar`.
  - Tarifas: `/admin/tarifas/[id]/editar`.
  - Los formularios `HabitacionForm`, `HuespedForm` y `TarifaForm` aceptan datos iniciales y usan el mismo `upsert` con `id` oculto.
- Gestion de habitaciones con carga de multiples imagenes:
  - Formulario en `src/components/forms/HabitacionForm.tsx`.
  - Server Action en `src/app/actions/crud.ts`.
  - Bucket publico Supabase Storage `habitaciones`.
  - Tabla `public.img_habitaciones` para guardar solo URLs asociadas a `public.habitaciones`.
  - El listado de `/admin/habitaciones` muestra miniatura de la primera imagen y conteo de fotos.
- Reservas por cliente y por staff.
- Logica actual de tarifas/reservas:
  - La relacion vigente es `public.habitaciones.tarifa_id -> public.tarifas.id`.
  - Una tarifa puede usarse en muchas habitaciones.
  - `public.tarifas.habitacion_id` fue eliminado de Supabase local y del frontend; no reintroducirlo.
  - El CRUD de tarifas vive en `/admin/tarifas`; no crear campos de precio/temporada dentro del formulario de habitacion.
  - Al crear/editar habitacion se selecciona una tarifa existente para asociarla; si no hay tarifas disponibles, el formulario ofrece ir a `/admin/tarifas`.
  - `upsertHabitacionAction` valida la tarifa seleccionada y guarda `public.habitaciones.tarifa_id`.
  - Al crear/editar tarifa desde `/admin/tarifas`, solo se define tipo, temporada, vigencia, precio y estado; la asociacion se hace desde habitaciones.
  - En reserva no se selecciona tarifa manualmente; se selecciona habitacion y la tarifa activa asociada se deriva implicitamente.
  - El servidor valida que `tarifa_id` corresponda a la habitacion antes de calcular precio/insertar reserva.
  - Como fallback, si una habitacion no tiene `tarifa_id`, la UI/servidor pueden usar una tarifa activa por `habitacion_tipo`.
  - `ReservaForm` y `PublicBookingCatalog` muestran habitaciones como tarjetas visuales con imagen, capacidad, tarifa por noche, mini disponibilidad de 7 dias y estado ocupada/disponible.
  - Fechas pasadas se bloquean con `DatePickerField`/`Calendar` y tambien se validan en `src/lib/db/reservas.ts`.
  - Habitaciones con reservas `pendiente_pago`, `confirmada`, `checkin` o bloqueos superpuestos se muestran/no permiten seleccion para ese rango.
  - Habitaciones inactivas no se pueden seleccionar en reservas.
  - Las fechas y timestamps se formatean en zona `America/La_Paz` mediante `src/lib/datetime.ts`.
  - Supabase local fue configurado con timezone `America/La_Paz` y `supabase-rest` fue reiniciado para tomar la configuracion.
- Tablas/listados:
  - `src/components/ui/table.tsx` evita saltos de linea en headers/celdas y usa scroll horizontal.
  - `src/components/crud/table-columns.tsx` centraliza columnas y formateo para mostrar todas las columnas del esquema real/local.
  - Listados de modulos principales y genericos usan `select("*")` cuando aplica para no ocultar columnas SQL.
- Creacion de cuenta cliente por staff.
- Reset de contrasena de cliente al telefono.
- Eventos internos y webhooks base.
- Migraciones iniciales en `supabase/migrations`.
- Supabase local self-hosted accesible en `http://localhost:8000`.
- `.env.local` ya fue completado desde Supabase Studio local con anon key y service role reales; no imprimir esos valores.
- Usuario admin de desarrollo creado:
  - email: `admin@admin.com`
  - password: `8433318`
  - rol: `admin`
- Base local fue limpiada antes de crear ese admin; al momento de esa limpieza quedaron vacias `auth.users`, `public.usuarios`, `public.huespedes`, `public.reservas`, `public.habitaciones` y `public.tarifas`.
- Se aplico manualmente en la DB local la columna `public.usuarios.must_change_password` usando `supabase_admin`.
- Se aplico en la DB local la migracion `supabase/migrations/202607040001_add_img_habitaciones_storage.sql`:
  - Crea bucket `habitaciones`.
  - Crea `public.img_habitaciones`.
  - Agrega politicas RLS para lectura autenticada y escritura por `admin`/`recepcionista`.
- Se aplicaron cambios locales de tarifas:
  - `supabase/migrations/202607090001_add_habitacion_tarifa_id.sql` agrega `public.habitaciones.tarifa_id`.
  - `supabase/migrations/202607090003_drop_tarifas_habitacion_id.sql` elimina `public.tarifas.habitacion_id`.
  - Se migro 1 asignacion antigua desde `tarifas.habitacion_id` hacia `habitaciones.tarifa_id`.
- Se aplico `supabase/migrations/202607090002_set_lapaz_timezone.sql` en DB local:
  - `ALTER DATABASE postgres SET timezone TO 'America/La_Paz'`.
  - `ALTER ROLE postgres SET timezone TO 'America/La_Paz'`.
  - Verificacion reciente: `current_setting('TimeZone') = America/La_Paz`.
- `next.config.ts` permite `next/image` desde `http://localhost:8000/storage/v1/object/public/habitaciones/**` y `http://127.0.0.1:8000/storage/v1/object/public/habitaciones/**`.
- `next.config.ts` configura `experimental.serverActions.bodySizeLimit = "30mb"` para carga de imagenes por Server Actions.
- Dark mode implementado siguiendo `https://ui.shadcn.com/docs/dark-mode/next`:
  - `next-themes`
  - `ThemeProvider` en `src/components/theme/ThemeProvider.tsx`
  - `ThemeToggle` con opciones `Claro`, `Oscuro`, `Sistema`
  - `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`
- Navbar responsive:
  - Home publica tiene nav superior con boton de iniciar sesion o acceso a cuenta si ya hay sesion.
  - Portal cliente (`src/components/app/UserNav.tsx`) usa menu movil con `DropdownMenu`.
  - Admin (`src/components/admin/AdminSidebar.tsx`) usa menu movil controlado con estado y se cierra al seleccionar una ruta.
  - El selector de tema esta fijo abajo a la derecha para no chocar con navbars.
- Importante: en `src/app/admin/layout.tsx`, el grid debe aplicarse solo desde `md`:
  - Correcto: `min-h-screen md:grid md:grid-cols-[260px_1fr]`
  - No volver a `grid min-h-screen grid-cols-1 ...`, porque en movil estira la fila del menu y el contenido de `/admin/usuarios` se ve centrado verticalmente.

## Siguiente paso recomendado

Validar esquema real/local y completar datos base:

1. Confirmar variables en `.env.local`.
2. Aplicar migraciones:
   - `supabase/migrations/202607030001_add_must_change_password.sql`
   - `supabase/migrations/202607030002_rls_base_policies.sql`
   - `supabase/migrations/202607040001_add_img_habitaciones_storage.sql`
   - `supabase/migrations/202607040002_add_tarifa_habitacion_id.sql`
   - `supabase/migrations/202607090001_add_habitacion_tarifa_id.sql`
   - `supabase/migrations/202607090002_set_lapaz_timezone.sql`
   - `supabase/migrations/202607090003_drop_tarifas_habitacion_id.sql`
3. Generar tipos desde Supabase real si el CLI esta disponible.
4. Reemplazar o ajustar `src/types/database.ts` con el esquema real.
5. Probar home publica `/`, seleccion de fechas/habitacion sin sesion, login/registro con `next`, restauracion en `/app/reservas/nueva`, creacion de reserva cliente y creacion de cliente por staff.
6. Probar subida de imagenes desde `/admin/habitaciones` con usuario `admin`.
7. Probar edicion de habitaciones, huespedes y tarifas desde sus rutas `/editar`.
8. Revisar columnas reales de `public.huespedes`; en la instancia local algunas columnas marcadas opcionales en `src/types/database.ts` pueden ser `NOT NULL`.

## Pendientes funcionales

- Ajustar `src/types/database.ts` contra el esquema real/local generado.
- Busqueda avanzada de huesped/cliente en `/admin/reservas/nueva`.
- Flujo combinado para crear cliente nuevo y reserva desde `/admin/reservas/nueva`.
- Edicion real de perfil cliente.
- Administracion completa de imagenes de habitaciones existentes: agregar fotos despues de crear, borrar fotos y ordenar galeria.
- Eliminacion/desactivacion controlada de registros en CRUD principales, con reglas segun reservas existentes.
- Estrategia de backup programado en produccion y almacenamiento externo cifrado.
- CRUD completo para transacciones, comprobantes, cancelaciones, bloqueos, estado de habitaciones, configuracion y usuarios.
- Carga de comprobantes con Supabase Storage si aplica.
- RLS final endurecido segun columnas reales.
- Pruebas automatizadas.

## Restricciones del proyecto

- No usar Pages Router.
- Preferir Server Components.
- Usar Client Components solo para estado, browser APIs o formularios interactivos.
- Usar componentes shadcn/ui siempre que exista el primitivo requerido en el proyecto o pueda agregarse razonablemente; no reemplazar `Button`, `Input`, `Select`, `DropdownMenu`, `Card`, `Table`, etc. con HTML nativo estilizado salvo que shadcn no tenga equivalente claro.
- Para seleccionar fechas, usar `src/components/ui/calendar.tsx` via `src/components/forms/DatePickerField.tsx`; no usar `Input type="date"` si el caso es seleccion de fecha.
- Usar React Hook Form + Zod con `zodResolver` en formularios.
- Usar `lucide-react` para iconos.
- Usar `next/link` y `next/image` cuando aplique.
- Mantener acciones administrativas con service role solo del lado servidor.
- Mantener subida de archivos de habitaciones del lado servidor; no exponer `SUPABASE_SERVICE_ROLE_KEY` ni subir con service role desde cliente.
- Mantener backups operativos del lado servidor y restringidos a `admin`; no incluir tablas Auth ni secretos en endpoints web.
- Para migracion completa entre Supabase self-hosted, usar scripts locales con `pg_dump/pg_restore` y TAR de Storage; no ejecutar restore sin `CONFIRM_RESTORE=YES`.
- Para imagenes de habitaciones, validar MIME `image/jpeg`, `image/png`, `image/webp`, `image/gif` y limite de 5 MB por archivo.
- Al crear o editar habitaciones, solo seleccionar una tarifa existente; no recrear el CRUD de tarifas dentro de habitaciones.
- Al crear o editar tarifas, no asociarlas a habitaciones; la asociacion vive en `habitaciones.tarifa_id`.
- No reintroducir `tarifas.habitacion_id`; esa columna fue eliminada.
- Al crear reservas, mantener validacion server-side de compatibilidad tarifa/habitacion; no confiar solo en el filtrado del formulario cliente.
- La reserva publica debe permitir explorar sin sesion, pero la insercion real solo ocurre en rutas protegidas despues de login/registro.
- No perder la intencion de reserva publica al pasar por login/registro; usar `src/lib/reservation-intent.ts`.
- Para selects de formularios, usar `src/components/ui/select.tsx` basado en shadcn/Radix; no usar `<select>` nativo.
- Para fechas de formularios, usar `DatePickerField` con `Calendar` y `Popover`; no usar inputs nativos de fecha.
- Si se modifica frontend responsive, verificar en viewport movil real o medir layout; no asumir solo por clases Tailwind.
