# Operacion de reservas

Este documento describe como funcionan las reglas de check-in/check-out y la cancelacion automatica de reservas pendientes de pago.

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

Significa que una reserva en estado `pendiente_pago` puede cancelarse automaticamente si pasan 120 minutos desde su creacion y no existe comprobante.

Si el valor es:

```text
0
```

la cancelacion automatica queda desactivada.

## Regla de cancelacion

El job cancela solo reservas que cumplen todo esto:

- `reservas.estado = pendiente_pago`
- `reservas.created_at` ya paso el tiempo configurado.
- No existe registro en `comprobantes` para esa reserva.
- No existe `transacciones.comprobante_url` para esa reserva.
- No existe transaccion con `estado_verificacion = aprobada` para esa reserva.

Cuando se cancela, se actualiza:

```text
reservas.estado = cancelada
reservas.notas_internas += motivo automatico
```

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

La app no ejecuta tareas de fondo por si sola. Para que la cancelacion sea automatica se debe configurar un cron externo.

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
```
