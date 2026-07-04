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

- Auth por Supabase en `/login` y `/crear-cuenta`.
- Middleware y guards server-side.
- Redireccion por rol desde `public.usuarios`.
- Panel admin bajo `/admin`.
- Backups administrativos bajo `/admin/backups`:
  - Backup operativo JSON de tablas publicas de la app en `/admin/backups/database`.
  - Backup operativo TAR de imagenes del bucket `habitaciones` en `/admin/backups/imagenes`.
  - Migracion completa self-hosted mediante `scripts/backup-supabase-local.sh` y `scripts/restore-supabase-local.sh`.
  - Implementacion server-only en `src/lib/backups.ts`.
  - Solo rol `admin`; los endpoints de app no exportan `auth.users` ni hashes de contrasenas.
- Portal cliente bajo `/app`.
- CRUD inicial de habitaciones, huespedes y tarifas.
- Gestion de habitaciones con carga de multiples imagenes:
  - Formulario en `src/components/forms/HabitacionForm.tsx`.
  - Server Action en `src/app/actions/crud.ts`.
  - Bucket publico Supabase Storage `habitaciones`.
  - Tabla `public.img_habitaciones` para guardar solo URLs asociadas a `public.habitaciones`.
  - El listado de `/admin/habitaciones` muestra miniatura de la primera imagen y conteo de fotos.
- Reservas por cliente y por staff.
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
- `next.config.ts` permite `next/image` desde `http://localhost:8000/storage/v1/object/public/habitaciones/**` y `http://127.0.0.1:8000/storage/v1/object/public/habitaciones/**`.
- `next.config.ts` configura `experimental.serverActions.bodySizeLimit = "30mb"` para carga de imagenes por Server Actions.
- Dark mode implementado siguiendo `https://ui.shadcn.com/docs/dark-mode/next`:
  - `next-themes`
  - `ThemeProvider` en `src/components/theme/ThemeProvider.tsx`
  - `ThemeToggle` con opciones `Claro`, `Oscuro`, `Sistema`
  - `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`
- Navbar responsive:
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
3. Generar tipos desde Supabase real si el CLI esta disponible.
4. Reemplazar o ajustar `src/types/database.ts` con el esquema real.
5. Probar registro cliente, login, creacion de reserva cliente y creacion de cliente por staff.
6. Probar subida de imagenes desde `/admin/habitaciones` con usuario `admin`.
7. Revisar columnas reales de `public.huespedes`; en la instancia local algunas columnas marcadas opcionales en `src/types/database.ts` pueden ser `NOT NULL`.

## Pendientes funcionales

- Ajustar `src/types/database.ts` contra el esquema real/local generado.
- Busqueda avanzada de huesped/cliente en `/admin/reservas/nueva`.
- Flujo combinado para crear cliente nuevo y reserva desde `/admin/reservas/nueva`.
- Edicion real de perfil cliente.
- Administracion completa de imagenes de habitaciones existentes: agregar fotos despues de crear, borrar fotos y ordenar galeria.
- Estrategia de backup programado en produccion y almacenamiento externo cifrado.
- CRUD completo para transacciones, comprobantes, cancelaciones, bloqueos, estado de habitaciones, configuracion y usuarios.
- Carga de comprobantes con Supabase Storage si aplica.
- RLS final endurecido segun columnas reales.
- Pruebas automatizadas.

## Restricciones del proyecto

- No usar Pages Router.
- Preferir Server Components.
- Usar Client Components solo para estado, browser APIs o formularios interactivos.
- Usar React Hook Form + Zod con `zodResolver` en formularios.
- Usar `lucide-react` para iconos.
- Usar `next/link` y `next/image` cuando aplique.
- Mantener acciones administrativas con service role solo del lado servidor.
- Mantener subida de archivos de habitaciones del lado servidor; no exponer `SUPABASE_SERVICE_ROLE_KEY` ni subir con service role desde cliente.
- Mantener backups operativos del lado servidor y restringidos a `admin`; no incluir tablas Auth ni secretos en endpoints web.
- Para migracion completa entre Supabase self-hosted, usar scripts locales con `pg_dump/pg_restore` y TAR de Storage; no ejecutar restore sin `CONFIRM_RESTORE=YES`.
- Para imagenes de habitaciones, validar MIME `image/jpeg`, `image/png`, `image/webp`, `image/gif` y limite de 5 MB por archivo.
- Si se modifica frontend responsive, verificar en viewport movil real o medir layout; no asumir solo por clases Tailwind.
