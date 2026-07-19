# Flujo de cancelaciones

Este documento describe como se registra una cancelacion de reserva y como queda guardado el resultado contable de la habitacion.

## Principio operativo

El sistema no controla movimientos externos de dinero. No marca si alguien devolvio, transfirio o entrego efectivo.

El sistema solo registra lo que ocurrio en el flujo de reserva:

- Cuanto estaba pagado y aprobado al momento de cancelar.
- Que porcentaje de retencion se aplico.
- Cuanto no se retuvo.
- Cuanto quedo finalmente para el hostal por esa habitacion.

## Tipos de cancelacion

### Cancelacion automatica por falta de comprobante

Aplica a reservas en estado `pendiente_pago` cuando vence el tiempo configurado para subir comprobante y no existe pago activo.

Condiciones:

- La reserva sigue en `pendiente_pago`.
- `reservas.created_at` ya supero `reserva_comprobante_espera_minutos`.
- No existe transaccion de pago `por_verificar` con `comprobante_url`.
- No existe transaccion de pago `aprobada` con `comprobante_url`.

Resultado:

```text
reservas.estado = cancelada
cancelaciones.politica_aplicada = sin_reembolso
cancelaciones.monto_pagado_aprobado = 0
cancelaciones.retencion_porcentaje_aplicado = 0
cancelaciones.monto_reembolso = 0
cancelaciones.monto_retenido = 0
```

La habitacion vuelve a estar disponible para ese rango.

### Cancelacion manual por solicitud del huesped

Aplica cuando personal cancela una reserva desde el detalle administrativo.

Estados permitidos:

```text
pendiente_pago
confirmada
checkin
```

El sistema suma los pagos aprobados de la reserva:

```text
public.transacciones.tipo = pago
public.transacciones.estado_verificacion = aprobada
```

Ese total se guarda como snapshot en:

```text
cancelaciones.monto_pagado_aprobado
```

## Politica configurable

La politica se configura desde:

```text
/admin/configuracion
```

Claves:

```text
cancelacion_reembolso_horas
cancelacion_retencion_porcentaje
```

Ejemplo:

```text
cancelacion_reembolso_horas = 12
cancelacion_retencion_porcentaje = 20
```

Si el check-in programado es a las `13:00`, el limite para cancelar con reembolso total es a la `01:00` del mismo dia.

Desde la `01:01`, el sistema aplica el porcentaje configurado sobre el monto pagado aprobado.

## Calculo

Variables:

```text
monto_pagado_aprobado = suma de pagos aprobados
retencion_porcentaje_aplicado = porcentaje configurado al momento de cancelar
monto_retenido = monto_pagado_aprobado * retencion_porcentaje_aplicado / 100
monto_reembolso = monto_pagado_aprobado - monto_retenido
```

Reglas:

- Si no hay pago aprobado, todo queda en `0`.
- Si se cancela antes o en el limite configurado, `monto_retenido = 0`.
- Si se cancela despues del limite, `monto_retenido` se calcula con el porcentaje configurado.
- Los montos se redondean a 2 decimales.

Ejemplo con reserva pagada de `400 BOB` y retencion `20%`:

```text
cancelaciones.monto_pagado_aprobado = 400.00
cancelaciones.retencion_porcentaje_aplicado = 20.00
cancelaciones.monto_retenido = 80.00
cancelaciones.monto_reembolso = 320.00
reservas.precio_ajustado = 80.00
```

El dato principal para cuentas del hostal es:

```text
cancelaciones.monto_retenido
```

## Registros persistidos

### `public.cancelaciones`

Guarda el hecho de cancelacion y el snapshot contable:

```text
reserva_id
motivo
horas_anticipacion
politica_aplicada
monto_pagado_aprobado
retencion_porcentaje_aplicado
monto_reembolso
monto_retenido
gestionado_por
created_at
```

### `public.reservas`

Tambien se actualiza la reserva:

```text
estado = cancelada
precio_ajustado = cancelaciones.monto_retenido
motivo_ajuste = resumen del calculo aplicado
notas_internas += motivo operativo
updated_at = now()
```

`precio_total` no se modifica. Debe conservar el valor original de la reserva.

## Atomicidad

La cancelacion manual usa el RPC:

```text
public.cancel_reservation_with_accounting
```

Ese RPC inserta `public.cancelaciones` y actualiza `public.reservas` en una sola operacion. Si la reserva ya tiene cancelacion o ya no esta en estado cancelable, falla sin dejar el flujo a medias.

## Disponibilidad

Una reserva cancelada deja de bloquear disponibilidad.

Las pantallas que muestran habitaciones consultan `/api/availability/version`; ese endpoint ejecuta primero el barrido de reservas vencidas y devuelve una version de disponibilidad. Si la version cambia, las pantallas abiertas refrescan los datos.

## Migraciones relacionadas

```text
supabase/migrations/202607190006_atomic_auto_cancel_reservations.sql
supabase/migrations/202607190007_add_cancellation_policy_settings.sql
supabase/migrations/202607190008_add_partial_cancellation_accounting.sql
supabase/migrations/202607190009_manual_cancellation_accounting_rpc.sql
supabase/migrations/202607190010_add_cancellation_accounting_snapshot.sql
```

## Archivos principales

```text
src/lib/cancellation-policy.ts
src/app/actions/cancelaciones.ts
src/components/admin/CancelReservationDialog.tsx
src/components/admin/ReservaDetalleCard.tsx
src/lib/db/auto-cancel-reservas.ts
```
