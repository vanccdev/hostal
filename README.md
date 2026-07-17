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
  - Se redirige a `/login?next=/app` o `/crear-cuenta?next=/app`.
  - Despues de login/registro, `/app` restaura habitacion y fechas sin perder lo llenado.
  - La creacion real de reserva sigue protegida bajo `/app`.
- Roles desde `public.usuarios`: `admin`, `recepcionista`, `limpieza`, `cliente`.
- Clientes Supabase:
  - Browser: `src/lib/supabase/client.ts`
  - Server: `src/lib/supabase/server.ts`
  - Admin server-only: `src/lib/supabase/admin.ts`
- Server Actions:
  - `src/app/actions/auth.ts`
  - `src/app/actions/clientes.ts`
  - `src/app/actions/comprobantes.ts`
  - `src/app/actions/reservas.ts`
  - `src/app/actions/password.ts`
  - `src/app/actions/crud.ts`
- Panel admin con rutas principales bajo `/admin`.
- Vista administrativa `/admin/reserva-detalle`:
  - Menu lateral "Reserva detalle" con permiso del modulo `reservas`.
  - Muestra reservas en tarjetas paginadas server-side.
  - Presenta datos relacionados de reserva, cliente/usuario, habitacion con imagen principal, tarifa, transacciones, comprobantes, cancelaciones, notificaciones y auditoria.
  - Busca por codigo, estado, canal, nombre del huesped, email, telefono, documento y nombre de usuario cliente.
  - Mantiene paginacion por query params y no carga todas las reservas en cliente.
- Backups administrativos bajo `/admin/backups`:
  - Descarga operativa de tablas publicas de la app en JSON.
  - Descarga operativa de imagenes del bucket `habitaciones` en TAR.
  - Descarga operativa de archivos del bucket `comprobante` en TAR.
  - Migracion completa self-hosted mediante scripts locales con `pg_dump`, `pg_restore` y archivo TAR de Storage.
  - La pagina incluye tutorial operativo para ejecutar backup/restore desde PC local o VPS.
- Portal cliente bajo `/app`:
  - La pantalla principal combina el resumen de reservas proximas con el formulario visual de nueva reserva.
  - Ya no depende de un boton "Nueva reserva" para iniciar el flujo.
  - Muestra habitaciones listas para seleccionar y restaura automaticamente la habitacion/fechas elegidas desde la home publica.
  - `/app/reservas/nueva` se mantiene disponible como ruta compatible del formulario.
  - Al crear reserva como cliente, redirige a `/app/reservas/[id]` para completar el pago.
  - `/app/reservas/[id]` muestra estado, contador de espera de comprobante, subida de PDF/imagen y actualizacion en tiempo real.
  - `/app/comprobantes` lista comprobantes subidos por el usuario mediante `comprobantes.uploaded_by`.
  - `/app/pagos` y `/app/cancelaciones` filtran por reservas del huesped y luego por `reserva_id`; no usan columnas inexistentes en tablas hijas.
- CRUD inicial funcional para habitaciones, huespedes y tarifas.
- Edicion de registros para CRUD principales:
  - Habitaciones: `/admin/habitaciones/[id]/editar`
  - Huespedes: `/admin/huespedes/[id]/editar`
  - Tarifas: `/admin/tarifas/[id]/editar`
  - Los listados principales editan registros desde dialogs shadcn sin cambiar de pagina.
- Gestion de habitaciones permite subir multiples imagenes al bucket Supabase Storage `habitaciones`; se guardan URLs en `public.img_habitaciones` y el listado muestra miniatura/conteo.
  - El formulario incluye una zona para arrastrar imagenes; la subida sigue ejecutandose por Server Action.
  - Al editar una habitacion, el dialog y la ruta `/admin/habitaciones/[id]/editar` muestran las imagenes actuales ya cargadas.
  - Subir imagenes nuevas al editar conserva las existentes y agrega nuevos registros a `public.img_habitaciones`.
  - Cada imagen existente puede eliminarse desde la edicion de habitacion; se borra el objeto del bucket `habitaciones` y la fila en `public.img_habitaciones`.
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
- Estados y tipos tecnicos:
  - `src/lib/reserva-estado.ts` muestra `reservas.estado` como texto legible sin cambiar el valor guardado.
  - `pendiente_pago` se muestra como `Pendiente de pago`, `no_show` como `No se presento`, etc.
  - `src/lib/notificacion-tipo.ts` muestra tipos de notificacion como `pago_pendiente` en texto legible.
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
- Configuracion operativa de reservas:
  - `/admin/configuracion` administra check-in, check-out y espera de comprobante.
  - `configuracion_hostal.reserva_comprobante_espera_minutos` define cuantos minutos se espera el comprobante antes de cancelar una reserva `pendiente_pago`.
  - Valor `0` desactiva la cancelacion automatica.
  - Endpoint protegido para cron: `/api/jobs/cancelar-reservas-vencidas`, con `Authorization: Bearer <CRON_SECRET>`.
  - La cancelacion automatica solo afecta reservas `pendiente_pago` vencidas sin comprobante, sin `comprobante_url` y sin transaccion aprobada.
  - Documentacion operativa en `OPERACION_RESERVAS.md`.
- Flujo de comprobantes de reserva:
  - Documentacion funcional en `FLUJO_RESERVA_COMPROBANTE.md`.
  - Bucket publico Supabase Storage `comprobante` para PDF/JPG/PNG/WEBP de hasta 10 MB.
  - `uploadReservationProofAction` valida pertenencia de la reserva, estado `pendiente_pago`, MIME y tamano antes de subir.
  - El archivo se nombra con codigo de reserva, nombre del huesped, telefono y sufijo unico.
  - Al subir se crean `public.transacciones` en `por_verificar` y `public.comprobantes` con `pdf_url` y `uploaded_by`.
  - Se notifica a recepcion/admin mediante `public.notificaciones`.
  - `/admin/reserva-detalle` permite abrir comprobante, confirmar reserva o rechazar comprobante.
  - Confirmar marca `transacciones.estado_verificacion = aprobada`, guarda verificador y cambia `reservas.estado = confirmada`.
  - Rechazar marca `transacciones.estado_verificacion = rechazada`.
  - Cliente y staff usan Supabase Realtime para refrescar estado/notificaciones sin polling.
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
  - Las tarjetas de habitaciones muestran una imagen estatica en el catalogo.
  - Al interactuar con una tarjeta se abre un dialog de detalle con galeria/carrusel de todas las fotos de esa habitacion.
  - La accion de reserva desde el dialog guarda la intencion y continua hacia `/app`.
- Tarjetas de habitaciones en el formulario de reserva:
  - Se elimino la etiqueta de conteo de fotos en `/app`.
  - La imagen cambia automaticamente entre fotos solo mientras hay hover sobre la tarjeta.
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
- Permitir reemplazar comprobante rechazado desde UI cliente, si se decide operativamente.
- Definir metodos de pago reales para reemplazar el default tecnico `qr_otro`.
- Agregar administracion completa de imagenes de habitaciones existentes: ordenar galeria. La visualizacion, carga nueva y eliminacion de fotos al editar ya estan implementadas.
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
CRON_SECRET=replace-with-random-cron-secret
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
- Storage local de habitaciones verificado despues de restore: `storage.objects` tiene 21 objetos y `public.img_habitaciones` tiene 21 URLs asociadas.
- Ultimo punto sano de backup/restore completo verificado: `backups/20260717T154907Z`.
- Se aplico historicamente `public.tarifas.habitacion_id` mediante `supabase/migrations/202607040002_add_tarifa_habitacion_id.sql`, pero luego fue reemplazado.
- La relacion vigente es `public.habitaciones.tarifa_id`; `public.tarifas.habitacion_id` fue eliminado por `supabase/migrations/202607090003_drop_tarifas_habitacion_id.sql`.
- `public.tarifas.peso` fue agregado por `supabase/migrations/202607120001_add_tarifas_peso.sql`; tiene constraint `0..3`, indices de prioridad/vigencia y un indice unico parcial para evitar repetir `habitacion_tipo + temporada + peso` en tarifas activas.
- `supabase/migrations/202607140001_add_stay_schedule_settings.sql` agrega `checkin_programado_at` y `checkout_programado_at` a `public.reservas` y claves de horario en `configuracion_hostal`.
- `supabase/migrations/202607140002_drop_reservas_real_check_times.sql` elimina `checkin_at` y `checkout_at` si todavia existen.
- `supabase/migrations/202607140003_add_payment_proof_timeout_setting.sql` agrega la clave `reserva_comprobante_espera_minutos`.
- `supabase/migrations/202607150001_add_comprobante_storage.sql` crea bucket `comprobante`, agrega `comprobantes.uploaded_by`, `comprobantes.created_at`, `notificaciones.usuario_id`, indices y Realtime para `reservas`/`notificaciones`.
- La DB local usa timezone `America/La_Paz`; `supabase-rest` fue reiniciado despues del cambio de schema/timezone.
- `src/types/database.ts` todavia debe validarse/generarse contra el esquema real.
- En la DB local, `public.huespedes.tipo_documento` y `public.huespedes.numero_documento` son `NOT NULL`; los tipos locales ya reflejan ese comportamiento.
- Limpieza local de predespliegue realizada:
  - Se preservo `admin@admin.com` como unico usuario en `auth.users` y `public.usuarios`.
  - Se preservaron `public.habitaciones`, `public.img_habitaciones`, Storage bucket `habitaciones`, `public.tarifas` y `public.configuracion_hostal`.
  - Quedaron vacias `public.huespedes`, `public.reservas`, `public.transacciones`, `public.comprobantes`, `public.notificaciones`, `public.cancelaciones`, `public.huespedes_reserva`, `public.bloqueos_fechas`, `public.estado_habitaciones`, `public.log_estados_habitacion` y `public.audit_log`.
  - Conteos finales verificados: `habitaciones = 10`, `img_habitaciones = 21`, Storage `habitaciones = 21`, `tarifas = 15`, `configuracion_hostal = 5`, `auth.users = 1`, `public.usuarios = 1`.

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

Para ejecutar la cancelacion automatica de reservas vencidas se debe configurar `CRON_SECRET` y llamar periodicamente:

```bash
curl -X POST http://localhost:3000/api/jobs/cancelar-reservas-vencidas \
  -H "Authorization: Bearer $CRON_SECRET"
```

Ver detalles en `OPERACION_RESERVAS.md`.

## Backups y Migracion

Para una descarga rapida desde la app:

- `/admin/backups/database`: exporta tablas publicas de la aplicacion en JSON.
- `/admin/backups/imagenes`: exporta imagenes del bucket `habitaciones` en TAR.
- `/admin/backups/comprobantes`: exporta archivos del bucket `comprobante` en TAR.

Para migrar a otro Supabase self-hosted con Auth, configuraciones internas, schemas, policies, storage metadata y archivos:

```bash
scripts/backup-supabase-local.sh
CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh backups/YYYYMMDDTHHMMSSZ
```

Ejecuta `scripts/backup-supabase-local.sh` en la maquina donde corre Supabase self-hosted con Docker. Si Next.js y
Supabase estan en el mismo VPS, se ejecuta desde la raiz del proyecto en ese VPS. Si estan separados, se ejecuta en la
maquina donde viven los contenedores de Supabase.

Los scripts usan por defecto los contenedores Docker `supabase-db` y `supabase-storage`, y el rol de base
`supabase_admin`. Se pueden cambiar con:

```bash
SUPABASE_DB_CONTAINER=nombre-db SUPABASE_STORAGE_CONTAINER=nombre-storage SUPABASE_DB_USER=supabase_admin scripts/backup-supabase-local.sh
```

El respaldo y restore de Storage se ejecuta dentro del contenedor `supabase-storage` sobre `/var/lib/storage`, para evitar
problemas de permisos del usuario del host. En esta instalacion local la estructura correcta incluye `stub/stub`; no
aplanar esa carpeta. Despues de extraer `storage.tar`, el restore recompone los xattrs `user.supabase.cache-control` y
`user.supabase.content-type` que Supabase Storage necesita para servir los archivos.

Estado verificado del flujo completo:

- `scripts/backup-supabase-local.sh` genera `database.dump` y `storage.tar` dentro de `backups/YYYYMMDDTHHMMSSZ`.
- `CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh backups/20260717T154907Z` restaura DB y Storage sin romper las imagenes.
- El restore filtra entradas internas conflictivas de `pg_restore` que no conviene aplicar en Supabase self-hosted local, como privilegios/event triggers administrados por roles internos.
- El restore de Storage recompone xattrs dentro del contenedor con `fs-xattr`; sin esos xattrs Supabase Storage puede responder `500`/`ENODATA` o servir imagenes como corruptas.
- URLs de prueba del bucket `habitaciones` responden `200 image/jpeg` despues del restore.

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
- `bash -n scripts/backup-supabase-local.sh` pasa.
- `bash -n scripts/restore-supabase-local.sh` pasa.
- Tablas/listados actualizados para usar paginacion server-side con Supabase y UI de busqueda/orden/columnas/filas por pagina.
- Supabase local verificado: `public.tarifas` ya no tiene `habitacion_id`; `public.habitaciones` tiene `tarifa_id`.
- Supabase local verificado: `public.tarifas` tiene `peso smallint NOT NULL DEFAULT 0`, constraint `tarifas_peso_check` e indice unico parcial `tarifas_tipo_temporada_peso_activa_uidx`.
- Supabase local verificado: `current_setting('TimeZone') = America/La_Paz`.
- `supabase-rest` fue reiniciado tras eliminar `tarifas.habitacion_id`, tras configurar timezone y tras agregar/validar `tarifas.peso`.
- Supabase local verificado con Docker: existen tabla `public.img_habitaciones`, bucket `habitaciones` y politicas RLS para `storage.objects`.
- Supabase local verificado con Docker: despues del restore sano existen 21 objetos en Storage `habitaciones` y 21 filas en `public.img_habitaciones`; las habitaciones tienen entre 2 y 3 fotos.
- Supabase local verificado con Docker: bucket `comprobante` publico con limite 10 MB y MIME `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- Supabase local verificado con Docker: `public.comprobantes` tiene `uploaded_by` y `created_at`; `public.notificaciones` tiene `usuario_id`; `reservas` y `notificaciones` estan publicadas en `supabase_realtime`.
- Supabase local verificado con Docker: `public.reservas` ya no tiene columnas antiguas `checkin_at`/`checkout_at`.
- Supabase local limpiado para predespliegue preservando solo admin, habitaciones, imagenes, tarifas y configuracion.
- `src/lib/env.ts` usa acceso directo a `process.env.NEXT_PUBLIC_*` para que Next exponga las variables publicas al bundle cliente.
- `/app/reservas/[id]` corregido para no renderizar `Badge` dentro de `<p>`, evitando error de hidratacion.
- `/app/pagos` y `/app/cancelaciones` corregidos para no filtrar por columnas inexistentes en tablas hijas.
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
- `supabase/migrations/202607140001_add_stay_schedule_settings.sql`
- `supabase/migrations/202607140002_drop_reservas_real_check_times.sql`
- `supabase/migrations/202607140003_add_payment_proof_timeout_setting.sql`
- `supabase/migrations/202607150001_add_comprobante_storage.sql`

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

La octava agrega `public.tarifas.peso`, constraints de prioridad e indice unico parcial para no repetir `habitacion_tipo + temporada + peso` en tarifas activas.

La novena agrega horarios programados de estadia y claves operativas de check-in/check-out.

La decima elimina columnas antiguas `public.reservas.checkin_at` y `public.reservas.checkout_at`.

La undecima agrega la configuracion de espera de comprobante.

La duodecima crea/configura el bucket `comprobante`, agrega columnas para trazabilidad de comprobantes/notificaciones y publica `reservas` y `notificaciones` en Supabase Realtime.

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
   - Seleccionar fechas y abrir una habitacion disponible desde su tarjeta/dialog.
   - Pulsar reservar desde el detalle.
   - Debe redirigir a `/login?next=/app` o permitir ir a `/crear-cuenta?next=/app`.
   - Tras login/registro, `/app` debe restaurar fechas y habitacion en el formulario integrado.
   - Confirmar reserva; la tarifa se deriva de la habitacion y la reserva se asocia al huesped de `auth.uid()`.
   - Debe redirigir a `/app/reservas/[id]`.
   - La pantalla debe mostrar contador de espera de comprobante segun `reserva_comprobante_espera_minutos`.
   - Subir comprobante PDF/JPG/PNG/WEBP de hasta 10 MB.
   - Deben crearse registros en `public.transacciones`, `public.comprobantes` y `public.notificaciones`.
   - El cliente debe ver estado "comprobante recibido" mientras recepcion verifica.

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

6. Staff verifica comprobante:
   - Login como `admin` o `recepcionista`.
   - Ir a `/admin/notificaciones` y confirmar que aparece el aviso de comprobante pendiente.
   - Ir a `/admin/reserva-detalle`.
   - Abrir el comprobante y revisar deposito manualmente.
   - Si es valido, pulsar "Confirmar reserva".
   - Debe actualizar `transacciones.estado_verificacion = aprobada` y `reservas.estado = confirmada`.
   - La pantalla del cliente en `/app/reservas/[id]` debe refrescarse por Realtime.
   - Si no es valido, pulsar "Rechazar comprobante" y validar `transacciones.estado_verificacion = rechazada`.

7. Reset password:
   - Ir a `/admin/usuarios`.
   - Seleccionar reset de un cliente.
   - Confirmar en `/admin/usuarios/[id]/reset-password`.
   - Password nueva = telefono normalizado.
   - `must_change_password = true`.

8. Staff crea habitacion con imagenes:
   - Login como `admin` o `recepcionista`.
   - Ir a `/admin/habitaciones`.
   - Crear habitacion, seleccionar una tarifa existente y seleccionar una o varias imagenes JPG, PNG, WEBP o GIF.
   - Cada imagen debe pesar 5 MB o menos.
   - Debe asociar la tarifa seleccionada actualizando `public.habitaciones.tarifa_id`.
   - Debe subir archivos a Storage bucket `habitaciones`, guardar URLs en `public.img_habitaciones` y mostrar miniatura/conteo en el listado.

9. Staff edita CRUD principales:
   - Ir a `/admin/habitaciones`, `/admin/huespedes` o `/admin/tarifas`.
   - Usar el boton `Editar` del listado.
   - Guardar cambios desde la ruta `/editar`.
   - Debe actualizar el registro existente sin crear duplicados.
   - En habitaciones, el dialog de edicion debe mostrar las imagenes actuales, permitir agregar nuevas imagenes sin borrar las existentes y eliminar fotos individuales.

10. Tablas con paginacion server-side:
   - Ir a listados como `/admin/usuarios`, `/admin/habitaciones`, `/admin/huespedes`, `/admin/tarifas`, `/admin/reservas`, `/admin/auditoria` o modulos genericos.
   - Cambiar filas por pagina y navegar paginas; debe actualizar query params y consultar Supabase con `range`.
   - Buscar en todas las columnas o una columna especifica; debe resetear a pagina 1 y consultar Supabase con filtros.
   - Ordenar desde encabezados; debe actualizar `sort`/`dir` y consultar Supabase.

## Seguridad

- No usar `SUPABASE_SERVICE_ROLE_KEY` en frontend.
- Operaciones administrativas usan `createSupabaseAdminClient()` solo en servidor.
- La subida de imagenes de habitaciones usa `SUPABASE_SERVICE_ROLE_KEY` solo en Server Action (`src/app/actions/crud.ts`), nunca en componentes cliente.
- Los backups operativos de la app usan `SUPABASE_SERVICE_ROLE_KEY` solo del lado servidor en `src/lib/backups.ts`; no exportan `auth.users` ni hashes de contrasenas.
- Los scripts de migracion completa usan `pg_dump`/`pg_restore` sobre el contenedor DB y TAR del directorio Storage; deben ejecutarse solo en infraestructura controlada.
- No ejecutar restore sin `CONFIRM_RESTORE=YES`; el restore reemplaza el estado actual de la DB/Storage destino por el estado del backup elegido.
- No aplanar ni editar manualmente `storage.tar`; en esta instalacion la estructura `stub/stub` y los xattrs restaurados son necesarios para que las imagenes sigan funcionando.
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
