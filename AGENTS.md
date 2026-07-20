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
  - Los listados principales editan desde `Dialog` shadcn para no navegar a otra pagina al editar una fila.
- Gestion de habitaciones con carga de multiples imagenes:
  - Formulario en `src/components/forms/HabitacionForm.tsx`.
  - Server Action en `src/app/actions/crud.ts`.
  - Bucket publico Supabase Storage `habitaciones`.
  - Tabla `public.img_habitaciones` para guardar solo URLs asociadas a `public.habitaciones`.
  - El listado de `/admin/habitaciones` muestra miniatura de la primera imagen y conteo de fotos.
  - El formulario tiene zona visual para arrastrar y seleccionar imagenes; la carga sigue siendo server-side.
- Reservas por cliente y por staff.
- Creacion de reservas por staff:
  - `/admin/clientes/nuevo` ofrece crear reserva al terminar de crear cliente.
  - `/admin/huespedes` incluye accion para crear reserva al huesped.
  - `/admin/reservas/nueva?huespedId=...` preselecciona huesped.
  - Tras crear reserva como staff, redirige a `/admin/reserva-detalle?q=<codigo_reserva>`.
- Pagos/comprobantes administrativos desde `/admin/reserva-detalle`:
  - Si la reserva esta `pendiente_pago` sin comprobante, staff/admin puede subir comprobante recibido o confirmar pago manual.
  - La subida usa dialog con caja para arrastrar/seleccionar archivo y previsualizador PDF/imagen.
  - Confirmar pago manual crea `public.transacciones` aprobada sin archivo y marca la reserva como `confirmada`.
  - Metodos de pago vigentes: `qr`, `tarjeta`, `efectivo`; `src/lib/payment-method.ts` muestra valores historicos como `QR`.
- Usuarios del sistema en `/admin/usuarios`:
  - Solo rol `admin` ve "Crear usuario del sistema".
  - Crea `admin`, `recepcionista` o `limpieza` en Auth y `public.usuarios`; no crea `public.huespedes`.
  - Usa contraseña temporal y `must_change_password = true`.
  - La accion `src/app/actions/usuarios.ts` usa `upsert` porque la DB local tiene trigger `on_auth_user_created` que crea `public.usuarios` al crear Auth.
- Logica actual de tarifas/reservas:
  - La relacion vigente es `public.habitaciones.tarifa_id -> public.tarifas.id`.
  - Una tarifa puede usarse en muchas habitaciones.
  - `public.tarifas.habitacion_id` fue eliminado de Supabase local y del frontend; no reintroducirlo.
  - El CRUD de tarifas vive en `/admin/tarifas`; no crear campos de precio/temporada dentro del formulario de habitacion.
  - Al crear/editar habitacion se selecciona una tarifa existente para asociarla; si no hay tarifas disponibles, el formulario ofrece ir a `/admin/tarifas`.
  - `upsertHabitacionAction` valida la tarifa seleccionada y guarda `public.habitaciones.tarifa_id`.
  - Al crear/editar tarifa desde `/admin/tarifas`, se define tipo, temporada, vigencia, precio, peso y estado; la asociacion se hace desde habitaciones.
  - `public.tarifas.peso` es `smallint NOT NULL DEFAULT 0` y solo permite `0`, `1`, `2`, `3`.
  - El peso resuelve solapamientos: si varias tarifas del mismo tipo estan vigentes el mismo dia, gana el peso mas alto; si empata, gana la vigencia mas reciente y luego la tarifa creada mas recientemente.
  - Supabase impide duplicar tarifas activas con el mismo `habitacion_tipo + temporada + peso` mediante el indice unico parcial `tarifas_tipo_temporada_peso_activa_uidx`.
  - `upsertTarifaAction` valida antes de guardar que no exista otra tarifa activa con el mismo tipo, temporada y peso, y devuelve un mensaje claro para cambiar el peso.
  - En reserva no se selecciona tarifa manualmente; se selecciona habitacion y la tarifa actual se deriva por fecha local actual (`America/La_Paz`), tipo de habitacion, vigencia y peso.
  - El helper central es `src/lib/tarifas.ts` (`selectTarifaActualParaHabitacion`).
  - El servidor valida que el `tarifa_id` enviado sea la tarifa vigente/prioritaria de hoy antes de calcular precio/insertar reserva.
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
  - `src/components/crud/DataTable.tsx` renderiza celdas en servidor y delega la UI interactiva a `src/components/crud/ClientDataTable.tsx`.
  - `src/lib/table-server.ts` centraliza parsing de query params, columnas buscables/ordenables y estado de paginacion.
  - Las tablas administrativas y del portal cliente usan paginacion server-side con Supabase: `select("*", { count: "exact" })`, `.range(from, to)`, `.order(...)`, `.ilike(...)`/`.or(...)`.
  - La UI de tablas permite buscar, elegir columna de busqueda, ordenar columnas, mostrar/ocultar columnas y cambiar filas por pagina usando query params (`page`, `pageSize`, `q`, `qColumn`, `sort`, `dir`).
  - No volver a paginar tablas grandes solo en cliente trayendo todas las filas; la paginacion debe mantenerse en Supabase y la UI solo controla el estado.
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
  - `supabase/migrations/202607120001_add_tarifas_peso.sql` agrega `public.tarifas.peso`, constraint de valores `0..3`, indices de prioridad/vigencia y el indice unico parcial para no repetir `habitacion_tipo + temporada + peso` en tarifas activas.
  - Se migro 1 asignacion antigua desde `tarifas.habitacion_id` hacia `habitaciones.tarifa_id`.
- Se aplico en la DB local `supabase/migrations/202607200001_normalize_metodo_pago_values.sql`:
  - Reemplaza `transacciones_metodo_pago_check` para aceptar solo `qr`, `tarjeta`, `efectivo`.
  - Normaliza valores historicos `qr_simple_tigo`, `qr_simple_bnb`, `qr_otro` a `qr`.
- Supabase local verificado con Docker:
  - `auth.users` tiene trigger `on_auth_user_created` que ejecuta `public.handle_new_usuario()` e inserta `public.usuarios` desde metadata.
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
- Estilos globales actualizados con paleta basada en el icono oficial del hostal (`public/icono.jpg`), usando tonos verdes, dorados y neutros calidos.
- Componentes interactivos recientes:
  - `src/components/ui/dialog.tsx` para edicion en modales.
  - `src/components/ui/switch.tsx` para estados booleanos con `Label` visible.
  - `src/components/ui/carousel.tsx` con autoplay para galerias.
  - `src/components/ui/sonner.tsx` para notificaciones toast globales.
  - `src/components/forms/ActionToast.tsx` conecta respuestas `ActionState` de Server Actions con Sonner para exitos, errores generales y validaciones.
  - `src/components/forms/DatePickerField.tsx` mantiene contraste correcto en hover dark mode.
- Home publica mejorada:
  - Usa el icono del hostal en marca/metadatos.
  - Muestra mapa OpenLayers con coordenadas del Hostal Plaza en Camargo: `-20.641224228393003, -65.20948944626011`.
  - Incluye link externo de Google Maps: `https://maps.app.goo.gl/AbQxFxgTE6t16oDo7`.
  - Usa imagenes de `public/dentro-hostal` y `public/en-camargo` con galeria/carrusel y descripciones.
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
   - `supabase/migrations/202607120001_add_tarifas_peso.sql`
   - `supabase/migrations/202607200001_normalize_metodo_pago_values.sql`
3. Generar tipos desde Supabase real si el CLI esta disponible y comparar con `src/types/database.ts`.
4. Probar home publica `/`, seleccion de fechas/habitacion sin sesion, login/registro con `next`, restauracion en `/app/reservas/nueva`, creacion de reserva cliente y creacion de cliente por staff.
5. Probar subida de imagenes desde `/admin/habitaciones` con usuario `admin`.
6. Probar edicion de habitaciones, huespedes y tarifas desde sus rutas `/editar`.
7. Probar tablas con suficientes registros para validar paginacion server-side, busqueda, orden y cambio de filas por pagina.
8. Revisar columnas reales de `public.huespedes`; en la instancia local `tipo_documento` y `numero_documento` son `NOT NULL`.

## Pendientes funcionales

- Seguir comparando `src/types/database.ts` contra tipos generados si se instala Supabase CLI.
- Busqueda avanzada de huesped/cliente en `/admin/reservas/nueva`.
- Flujo combinado para crear cliente nuevo y reserva desde `/admin/reservas/nueva`.
- Edicion real de perfil cliente.
- Administracion completa de imagenes de habitaciones existentes: agregar fotos despues de crear, borrar fotos y ordenar galeria.
- Eliminacion/desactivacion controlada de registros en CRUD principales, con reglas segun reservas existentes.
- Estrategia de backup programado en produccion y almacenamiento externo cifrado.
- CRUD avanzado restante para transacciones, comprobantes, cancelaciones, bloqueos, estado de habitaciones y configuracion; en usuarios ya existe creacion de personal y reset de clientes, falta edicion/desactivacion controlada.
- Carga de comprobantes con Supabase Storage ya existe para cliente y staff/admin; falta reemplazo de comprobantes rechazados desde UI cliente si se decide.
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
- Al crear o editar tarifas activas, no permitir repetir el mismo `habitacion_tipo + temporada + peso`; si se necesita otra tarifa para la misma temporada, usar otro peso o desactivar la anterior.
- No reintroducir `tarifas.habitacion_id`; esa columna fue eliminada.
- Al crear reservas, mantener validacion server-side de compatibilidad tarifa/habitacion; no confiar solo en el filtrado del formulario cliente.
- La reserva publica debe permitir explorar sin sesion, pero la insercion real solo ocurre en rutas protegidas despues de login/registro.
- No perder la intencion de reserva publica al pasar por login/registro; usar `src/lib/reservation-intent.ts`.
- Para selects de formularios, usar `src/components/ui/select.tsx` basado en shadcn/Radix; no usar `<select>` nativo.
- Para fechas de formularios, usar `DatePickerField` con `Calendar` y `Popover`; no usar inputs nativos de fecha.
- Para confirmaciones, advertencias o acciones destructivas en UI, usar `src/components/ui/dialog.tsx` de shadcn/Radix; no usar `window.alert`, `window.confirm` ni `window.prompt`.
- Para tablas/listados, mantener paginacion y filtrado en Supabase con `range`/`count`; no cargar todas las filas para filtrar o paginar en Next.js.
- Si se modifica frontend responsive, verificar en viewport movil real o medir layout; no asumir solo por clases Tailwind.
