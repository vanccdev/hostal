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
- Portal cliente con rutas principales bajo `/app`.
- CRUD inicial funcional para habitaciones, huespedes y tarifas.
- Flujo base de reservas por cliente y por personal.
- Flujo base `createClientAccountByStaff`.
- Flujo base `resetClientPasswordToPhone`.
- Eventos internos y dispatch de webhooks sin romper la operacion principal si el webhook falla.
- Migraciones SQL iniciales en `supabase/migrations`.

Pendiente o siguiente iteracion:

- Conectar con una instancia real de Supabase self-hosted y validar nombres/tipos exactos de columnas.
- Ajustar tipos `src/types/database.ts` usando tipos generados desde Supabase cuando el esquema real este disponible.
- Completar CRUD avanzado para transacciones, comprobantes, cancelaciones, bloqueos, estado de habitaciones, configuracion y usuarios.
- Implementar busqueda avanzada de cliente por nombre, email, telefono y documento en `/admin/reservas/nueva`.
- Implementar flujo combinado "crear cliente nuevo + crear reserva" desde `/admin/reservas/nueva`.
- Implementar edicion de perfil cliente.
- Implementar carga real de comprobantes si se usara Supabase Storage.
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

## Desarrollo

```bash
pnpm dev
```

Abrir:

```text
http://localhost:3000
```

Si faltan variables de Supabase, la app puede mostrar error al entrar a rutas que consultan auth.

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

## Migraciones

Archivos:

- `supabase/migrations/202607030001_add_must_change_password.sql`
- `supabase/migrations/202607030002_rls_base_policies.sql`

La primera migracion agrega:

```sql
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false NOT NULL;
```

La segunda habilita RLS y propone politicas base. Debe revisarse contra el esquema real antes de produccion, especialmente tablas secundarias como `transacciones`, `comprobantes` y `cancelaciones`.

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

## Seguridad

- No usar `SUPABASE_SERVICE_ROLE_KEY` en frontend.
- Operaciones administrativas usan `createSupabaseAdminClient()` solo en servidor.
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

1. Conectar Supabase real.
2. Generar tipos desde el esquema real.
3. Ajustar `src/types/database.ts`.
4. Probar auth y registros contra self-hosted.
5. Completar los CRUD secundarios y el flujo combinado de reserva admin con cliente nuevo.
