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
11. Si el comprobante es rechazado, la reserva sigue `pendiente_pago` y el cliente puede subir otro comprobante mientras no venza el tiempo de espera.
12. El cliente recibe la actualizacion en pantalla y en notificaciones.

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
| `/admin/verificar-comprobantes` | Cola dedicada para revisar comprobantes pendientes y cambiar el estado de la reserva. |
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

## Relacion con cancelaciones

Las reservas pueden terminar canceladas por dos caminos principales:

- Automaticamente, si vence el tiempo de espera y no hay comprobante activo.
- Manualmente, si personal cancela la reserva desde el detalle administrativo.

El detalle de reglas, politica configurable y montos persistidos esta en:

```text
FLUJO_CANCELACIONES.md
```

## Configuracion de tiempo de espera

El tiempo disponible para subir comprobante se guarda en:

```text
public.configuracion_hostal.clave = reserva_comprobante_espera_minutos
```

Reglas:

- Si el valor es mayor a `0`, la pantalla del cliente muestra un contador.
- Si el valor es `0`, la cancelacion automatica por falta de comprobante queda desactivada.
- El contador se calcula desde `reservas.created_at`.
- El job de cancelacion cancela reservas `pendiente_pago` vencidas sin comprobante activo.
- La pantalla de pago tambien consulta `/api/app/reservas/[id]/status`; si esa reserva puntual ya vencio, el endpoint ejecuta la misma cancelacion para que no dependa solo del cron.
- Las pantallas que muestran disponibilidad consultan `/api/availability/version`; ese endpoint ejecuta primero el barrido de reservas vencidas para liberar habitaciones en otros navegadores.
- Un comprobante activo es una transaccion de pago con `estado_verificacion = por_verificar` o `aprobada` y `comprobante_url`.
- Los comprobantes rechazados quedan como historial, pero no bloquean la cancelacion automatica cuando vence el tiempo.

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
- No debe existir un comprobante activo en revision para esa reserva.
- Si el comprobante anterior fue rechazado, el cliente puede subir otro mientras la reserva siga `pendiente_pago` y no haya vencido el tiempo de espera.
- La validacion de vencimiento se aplica tambien del lado servidor, no solo en la UI.
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

La ruta del objeto queda ordenada por fecha local y correo del cliente:

```text
comprobante/
  YYYY-MM-DD/
    cliente@correo.com/
      comprobante-nombrecliente-YYYYMMDD-HHMMSS-1.pdf
      comprobante-nombrecliente-YYYYMMDD-HHMMSS-2.webp
```

Reglas de nombre:

- Primer nivel: fecha del dia en zona `America/La_Paz`.
- Segundo nivel: correo del cliente normalizado para Storage.
- Nombre: `comprobante-<nombrecliente>-<fechahora>-<N>.<extension>`.
- `N` se calcula contando archivos existentes en esa carpeta fecha/correo y sumando `1`.
- La extension se deriva del archivo subido: `pdf`, `jpg`, `png` o `webp`.

La UI muestra una caja donde se puede soltar o seleccionar el archivo y previsualiza PDF/imagen antes de subir.

## Registros creados al subir comprobante

Al subir el comprobante se crean estos registros:

### `public.transacciones`

```text
reserva_id = reserva.id
monto = reserva.precio_total
metodo_pago = qr_otro
estado_verificacion = por_verificar
comprobante_url = URL publica del archivo
referencia_externa = codigo corto interno compatible con varchar
tipo = pago
```

### `public.comprobantes`

```text
reserva_id = reserva.id
transaccion_id = transacciones.id
numero_comprobante = codigo corto interno compatible con varchar(20)
emitido_at = fecha/hora de subida
pdf_url = URL publica del archivo
uploaded_by = auth.uid() del cliente
```

Nota: el nombre completo ordenado vive en Storage y se consulta mediante `pdf_url`. Los campos `referencia_externa` y
`numero_comprobante` se mantienen cortos porque la base local tiene limites `varchar`.

### `public.notificaciones`

Se crea una notificacion interna para recepcion/admin indicando que hay un comprobante pendiente de revision.

## Verificacion manual por personal

El personal revisa principalmente desde:

```text
/admin/verificar-comprobantes
```

Tambien puede revisar desde `/admin/reserva-detalle` cuando esta viendo una reserva concreta.

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
reservas.estado permanece pendiente_pago
```

La reserva permanece `pendiente_pago`; la habitacion sigue bloqueada para ese rango mientras la reserva no sea cancelada.
El cliente ve el rechazo en `/app/reservas/[id]` y puede subir otro comprobante valido si todavia esta dentro del tiempo de espera.

Si el tiempo de espera vence y no hay un comprobante activo `por_verificar` o `aprobada`, el job de cancelacion o el endpoint de estado del cliente cambia:

```text
reservas.estado = cancelada
public.cancelaciones = registro con politica sin_reembolso y montos contables en 0
```

Al cancelarse la reserva, la habitacion vuelve a estar disponible para nuevas reservas en ese rango.

## Notificaciones y tiempo real

Para actualizaciones dentro de la app se usa Supabase Realtime reforzado con polling protegido en las pantallas criticas.

Suscripciones usadas:

- Cliente en `/app/reservas/[id]`:
  - `public.reservas` filtrado por `id`.
  - `public.transacciones` filtrado por `reserva_id`.
  - `public.comprobantes` filtrado por `reserva_id`.
  - `public.notificaciones` filtrado por `usuario_id`.
  - Polling a `/api/app/reservas/[id]/status` cada 5 segundos, al recuperar foco y al volver visible la pestana.
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
src/app/admin/verificar-comprobantes/page.tsx
src/components/admin/ComprobanteVerificationActions.tsx
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
