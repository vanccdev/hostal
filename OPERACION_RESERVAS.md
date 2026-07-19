# Operacion de reservas

Este documento describe como funcionan las reglas de check-in/check-out, espera de comprobante y disponibilidad de reservas.

El flujo detallado de cancelaciones y los montos contables quedan documentados en:

```text
FLUJO_CANCELACIONES.md
```

## Configuracion en la app

La configuracion se administra desde:

```text
/admin/configuracion
```

Los valores se guardan en la tabla:

```text
public.configuracion_hostal
```

## Check-in y check-out programados

Las claves usadas son:

| Clave | Ejemplo | Uso |
| --- | --- | --- |
| `reserva_checkin_hora` | `14:00` | Hora desde la que el huesped puede ocupar la habitacion. |
| `reserva_checkout_hora` | `12:00` | Hora limite para desocupar la habitacion. |
| `reserva_turnover_minutos` | `120` | Diferencia calculada entre check-out y nuevo check-in. |
| `reserva_timezone` | `America/La_Paz` | Zona horaria operativa fija. |

Al crear una reserva, el sistema genera:

```text
reservas.checkin_programado_at
reservas.checkout_programado_at
```

Estos campos se usan para:

- Mostrar horarios programados.
- Calcular disponibilidad por rango.
- Evitar solapamientos de reservas.
- Mostrar si una habitacion esta ocupada o disponible.

Importante: los horarios programados no son eventos reales de recepcion. Son la ventana operativa prevista para la estadia.

## Cancelacion automatica por falta de comprobante

La clave usada es:

```text
reserva_comprobante_espera_minutos
```

Ejemplo:

```text
120
```

Significa que una reserva en estado `pendiente_pago` puede cancelarse automaticamente si pasan 120 minutos desde su creacion y no existe comprobante activo.

Si el valor es:

```text
0
```

la cancelacion automatica queda desactivada.

## Regla de cancelacion

El job cancela solo reservas que cumplen todo esto:

- `reservas.estado = pendiente_pago`
- `reservas.created_at` ya paso el tiempo configurado.
- No existe transaccion de pago con `estado_verificacion = por_verificar` y `comprobante_url`.
- No existe transaccion de pago con `estado_verificacion = aprobada` y `comprobante_url`.

Los comprobantes rechazados quedan como historial, pero no evitan la cancelacion automatica cuando vence el tiempo.

Importante: en la base local `reservas.created_at` es `timestamp without time zone`. Por eso la app calcula el corte en hora operativa `America/La_Paz` y lo envia sin sufijo UTC (`Z`); no debe compararse contra un ISO UTC directo porque cancelaria reservas nuevas antes de tiempo.

Cuando se cancela, se actualiza:

```text
reservas.estado = cancelada
reservas.notas_internas += motivo automatico
```

Tambien se crea un registro en:

```text
public.cancelaciones
```

con motivo de vencimiento de espera de comprobante, politica `sin_reembolso` y montos contables en `0`.

Ademas del cron externo, la pantalla `/app/reservas/[id]` consulta `/api/app/reservas/[id]/status`; si esa reserva ya vencio, ese endpoint dispara la misma cancelacion puntual para que el cliente vea el cambio aunque el cron todavia no haya corrido.

Las pantallas de disponibilidad (`/`, `/app`, `/app/reservas/nueva` y `/admin/reservas/nueva`) consultan `/api/availability/version`. Ese endpoint tambien ejecuta la cancelacion automatica de reservas vencidas antes de calcular la version de disponibilidad. Asi una habitacion deja de aparecer ocupada en otros navegadores aunque nadie este mirando la pantalla de pago de esa reserva.

## Endpoint para ejecutar el job

La app expone un endpoint protegido:

```text
GET  /api/jobs/cancelar-reservas-vencidas
POST /api/jobs/cancelar-reservas-vencidas
```

Debe llamarse con:

```text
Authorization: Bearer <CRON_SECRET>
```

La variable de entorno requerida es:

```env
CRON_SECRET=un-secreto-largo-y-aleatorio
```

Si `CRON_SECRET` no esta configurado, el endpoint no ejecuta cambios.

## Ejemplo con curl

```bash
curl -X POST http://localhost:3000/api/jobs/cancelar-reservas-vencidas \
  -H "Authorization: Bearer $CRON_SECRET"
```

Respuesta esperada:

```json
{
  "ok": true,
  "checked": 3,
  "canceled": 2,
  "disabled": false,
  "timeoutMinutes": 120,
  "cutoff": "2026-07-15T10:00:00.000Z"
}
```

## Automatizacion

Para barrer todas las reservas vencidas sin depender de que el cliente tenga la pantalla abierta, se debe configurar un cron externo.

La pantalla de pago del cliente tambien consulta `/api/app/reservas/[id]/status`. Si esa reserva puntual ya vencio, ese endpoint dispara la cancelacion de esa reserva y crea su registro en `public.cancelaciones`.

Las pantallas de disponibilidad usan `/api/availability/version` como respaldo. Este endpoint ejecuta el barrido de reservas vencidas antes de devolver la version de disponibilidad, por lo que ayuda a liberar habitaciones en navegadores abiertos sin depender solo del cron global.

## Politica de cancelacion por solicitud del huesped

Las claves usadas son:

```text
cancelacion_reembolso_horas
cancelacion_retencion_porcentaje
```

Ejemplo:

```text
cancelacion_reembolso_horas = 24
cancelacion_retencion_porcentaje = 20
```

Significa que si el check-in programado es a las 13:00, el huesped tiene hasta las 01:00 de ese mismo dia para cancelar con reembolso total. Desde las 01:01 se aplica la retencion configurada sobre el monto efectivamente pagado y aprobado.

Esta politica se muestra al reservar en el catalogo publico, en `/app`, en `/app/reservas/nueva` y en `/admin/reservas/nueva`.

En cancelaciones manuales de reservas pagadas, los montos quedan congelados en `public.cancelaciones`. La reserva conserva `precio_total` como monto original y guarda `precio_ajustado` con el monto final que quedo para el hostal. Ver `FLUJO_CANCELACIONES.md`.

Opciones comunes:

- Cron del servidor.
- Cron de Docker host.
- Servicio externo de scheduled jobs.
- Scheduler del proveedor donde se despliegue la app.

Ejemplo de cron cada 5 minutos:

```cron
*/5 * * * * curl -fsS -X POST https://tu-dominio.com/api/jobs/cancelar-reservas-vencidas -H "Authorization: Bearer TU_CRON_SECRET"
```

## Archivos principales

```text
src/lib/stay-settings.ts
src/components/forms/StaySettingsForm.tsx
src/app/actions/crud.ts
src/lib/db/auto-cancel-reservas.ts
src/app/api/jobs/cancelar-reservas-vencidas/route.ts
supabase/migrations/202607140003_add_payment_proof_timeout_setting.sql
FLUJO_CANCELACIONES.md
```
