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
- Portal cliente bajo `/app`.
- CRUD inicial de habitaciones, huespedes y tarifas.
- Reservas por cliente y por staff.
- Creacion de cuenta cliente por staff.
- Reset de contrasena de cliente al telefono.
- Eventos internos y webhooks base.
- Migraciones iniciales en `supabase/migrations`.

## Siguiente paso recomendado

Conectar Supabase real y validar el esquema:

1. Confirmar variables en `.env.local`.
2. Aplicar migraciones:
   - `supabase/migrations/202607030001_add_must_change_password.sql`
   - `supabase/migrations/202607030002_rls_base_policies.sql`
3. Generar tipos desde Supabase real si el CLI esta disponible.
4. Reemplazar o ajustar `src/types/database.ts` con el esquema real.
5. Probar registro cliente, login, creacion de reserva cliente y creacion de cliente por staff.

## Pendientes funcionales

- Busqueda avanzada de huesped/cliente en `/admin/reservas/nueva`.
- Flujo combinado para crear cliente nuevo y reserva desde `/admin/reservas/nueva`.
- Edicion real de perfil cliente.
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
