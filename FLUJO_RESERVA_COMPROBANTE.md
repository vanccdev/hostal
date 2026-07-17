# Flujo de reserva con comprobante

Este documento describe el flujo funcional para reservas creadas por clientes y verificadas manualmente por personal del hostal.

## Resumen

1. El cliente inicia sesion o crea una cuenta.
2. Selecciona fechas y una habitacion disponible.
3. Crea una reserva en estado `pendiente_pago`.
4. El sistema muestra una pantalla de espera con contador para subir comprobante.
5. El cliente sube un comprobante PDF o imagen.
6. El archivo se guarda en Supabase Storage, bucket `comprobante`.
7. La URL del archivo se registra en `public.comprobantes`.
8. Se notifica al personal encargado mediante `public.notificaciones`.
9. Admin o recepcionista revisa el deposito manualmente.
10. Si el pago es valido, confirma la reserva.
11. El cliente recibe la actualizacion en pantalla y en notificaciones.

## Rutas involucradas

| Ruta | Uso |
| --- | --- |
| `/` | Catalogo publico, seleccion inicial de habitacion y fechas. |
| `/login` | Inicio de sesion con redireccion posterior. |
| `/crear-cuenta` | Registro de cliente con redireccion posterior. |
| `/app` | Portal cliente con formulario visual de reserva. |
| `/app/reservas/[id]` | Pantalla de espera, contador y subida de comprobante. |
| `/app/comprobantes` | Historial de comprobantes subidos por el cliente. |
| `/app/notificaciones` | Notificaciones del cliente. |
| `/admin/notificaciones` | Avisos internos para personal. |
| `/admin/reserva-detalle` | Revision de reserva, comprobantes, transacciones y confirmacion manual. |
| `/admin/configuracion` | Configuracion del tiempo de espera del comprobante. |

## Estados principales

La tabla `public.reservas` usa estos estados relevantes para el flujo:

| Estado | Significado |
| --- | --- |
| `pendiente_pago` | La reserva fue creada, pero aun requiere comprobante o verificacion. |
| `confirmada` | El personal verifico el deposito y acepto la reserva. |
| `cancelada` | La reserva fue cancelada, por ejemplo por vencer el tiempo sin comprobante. |

Nota: aunque operativamente se hable de "reservado", el estado tecnico usado actualmente es `confirmada`.

## Configuracion de tiempo de espera

El tiempo disponible para subir comprobante se guarda en:

```text
public.configuracion_hostal.clave = reserva_comprobante_espera_minutos
```

Reglas:

- Si el valor es mayor a `0`, la pantalla del cliente muestra un contador.
- Si el valor es `0`, la cancelacion automatica por falta de comprobante queda desactivada.
- El contador se calcula desde `reservas.created_at`.
- El job de cancelacion cancela reservas `pendiente_pago` vencidas sin comprobante.

La documentacion operativa del job esta en:

```text
OPERACION_RESERVAS.md
```

## Subida de comprobante

El cliente sube el comprobante desde:

```text
/app/reservas/[id]
```

Validaciones:

- La reserva debe pertenecer al cliente autenticado.
- La reserva debe estar en estado `pendiente_pago`.
- No debe existir ya un comprobante para esa reserva.
- Tipos permitidos:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/webp`
- Tamano maximo: 10 MB.

El archivo se guarda en Supabase Storage:

```text
bucket: comprobante
```

El nombre del archivo incluye:

- Codigo de reserva.
- Nombre del huesped.
- Telefono del huesped.
- Sufijo unico.

Ejemplo conceptual:

```text
R260715ABCDE-juan-perez-77777777-a1b2c3d4.pdf
```

## Registros creados al subir comprobante

Al subir el comprobante se crean estos registros:

### `public.transacciones`

```text
reserva_id = reserva.id
monto = reserva.precio_total
metodo_pago = qr_otro
estado_verificacion = por_verificar
comprobante_url = URL publica del archivo
referencia_externa = nombre base del archivo
tipo = pago
```

### `public.comprobantes`

```text
reserva_id = reserva.id
transaccion_id = transacciones.id
numero_comprobante = nombre base del archivo
emitido_at = fecha/hora de subida
pdf_url = URL publica del archivo
uploaded_by = auth.uid() del cliente
```

### `public.notificaciones`

Se crea una notificacion interna para recepcion/admin indicando que hay un comprobante pendiente de revision.

## Verificacion manual por personal

El personal revisa desde:

```text
/admin/reserva-detalle
```

Si existe una transaccion con:

```text
estado_verificacion = por_verificar
```

la tarjeta muestra acciones:

- Ver comprobante.
- Confirmar reserva.
- Rechazar comprobante.

### Confirmar reserva

Al confirmar:

```text
transacciones.estado_verificacion = aprobada
transacciones.verificado_por = usuario actual
transacciones.verificado_at = now()
reservas.estado = confirmada
```

Tambien se crea una notificacion para el cliente indicando que la reserva fue verificada y confirmada.

### Rechazar comprobante

Al rechazar:

```text
transacciones.estado_verificacion = rechazada
transacciones.verificado_por = usuario actual
transacciones.verificado_at = now()
```

La reserva permanece pendiente hasta que se defina la siguiente accion operativa.

## Notificaciones y tiempo real

Para actualizaciones dentro de la app se usa Supabase Realtime, no polling.

Suscripciones usadas:

- Cliente en `/app/reservas/[id]`:
  - `public.reservas` filtrado por `id`.
  - `public.notificaciones` filtrado por `usuario_id`.
- Personal en `/admin/notificaciones`:
  - `public.notificaciones` para refrescar al recibir avisos nuevos.

Los webhooks existentes se mantienen para integraciones externas servidor-a-servidor:

```env
WEBHOOK_RESERVAS_URL=
WEBHOOK_PAGOS_URL=
WEBHOOK_AUTH_EVENTS_URL=
```

## Migracion requerida

El flujo requiere aplicar:

```text
supabase/migrations/202607150001_add_comprobante_storage.sql
```

Esta migracion:

- Crea o actualiza el bucket `comprobante`.
- Permite PDF/JPG/PNG/WEBP hasta 10 MB.
- Agrega `comprobantes.uploaded_by`.
- Agrega `comprobantes.created_at`.
- Agrega `notificaciones.usuario_id`.
- Crea indices auxiliares.
- Habilita Realtime para `public.reservas` y `public.notificaciones`.

En la instancia local fue aplicada y verificada con Docker:

```text
storage.buckets.id = comprobante
storage.buckets.public = true
storage.buckets.file_size_limit = 10485760
allowed_mime_types = application/pdf,image/jpeg,image/png,image/webp
public.comprobantes.uploaded_by existe
public.comprobantes.created_at existe
public.notificaciones.usuario_id existe
public.reservas y public.notificaciones estan en supabase_realtime
```

## Archivos principales

```text
src/app/actions/reservas.ts
src/app/actions/comprobantes.ts
src/components/app/ReservationPaymentStatus.tsx
src/app/app/reservas/[id]/page.tsx
src/components/admin/ReservaDetalleCard.tsx
src/components/admin/RealtimeNotificationsRefresh.tsx
src/lib/notifications/emit-event.ts
src/lib/db/auto-cancel-reservas.ts
src/app/api/jobs/cancelar-reservas-vencidas/route.ts
```

## Puntos operativos pendientes

- Definir si un comprobante rechazado puede reemplazarse desde la UI del cliente.
- Definir si `metodo_pago = qr_otro` debe cambiarse por un metodo especifico cuando existan datos bancarios reales.
- Endurecer RLS final para que clientes puedan leer solo sus comprobantes y notificaciones.

## Estado local de predespliegue

La base local fue limpiada para pruebas de predespliegue preservando:

```text
auth.users/admin@admin.com = 1
public.usuarios/admin = 1
public.habitaciones = 10
public.img_habitaciones = 21
storage.objects bucket habitaciones = 21
public.tarifas = 15
public.configuracion_hostal = 5
```

Quedaron vacias:

```text
public.huespedes
public.reservas
public.transacciones
public.comprobantes
public.notificaciones
public.cancelaciones
public.huespedes_reserva
public.bloqueos_fechas
public.estado_habitaciones
public.log_estados_habitacion
public.audit_log
```
