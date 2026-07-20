# Flujo de Estado de Habitaciones

`estado_habitaciones` guarda el estado operativo interno de cada habitacion. No reemplaza reservas ni bloqueos.

## Para que sirve

Sirve para que recepcion y limpieza sepan que trabajo operativo necesita cada habitacion.

Casos comunes:

- El huesped hizo checkout y la habitacion queda en `limpieza`.
- Limpieza termina y marca la habitacion como `disponible`.
- Recepcion detecta un problema y marca `mantenimiento`.
- Staff deja notas como `falta cambiar sabana`, `bano revisado` o `pintura pendiente`.

## Diferencia con otras tablas

- `reservas`: define ocupacion real por un huesped.
- `bloqueos_fechas`: define fechas no reservables por mantenimiento, evento o cierre.
- `estado_habitaciones`: define estado operativo interno para trabajo diario.
- `log_estados_habitacion`: guarda historial de cambios de estado.

## Prioridad visual

En `/admin/estado-habitaciones`, el estado visible se calcula con esta prioridad:

1. Si hay reserva activa, se muestra `Ocupada`.
2. Si hay bloqueo activo, se muestra `Bloqueada`.
3. Si no hay reserva ni bloqueo, se muestra el estado interno de `estado_habitaciones`.

Esto evita confundir una habitacion ocupada por reserva con una habitacion marcada manualmente como disponible.

## Impacto en disponibilidad

Actualmente `estado_habitaciones` no bloquea reservas automaticamente.

Para impedir reservas se debe usar `/admin/bloqueos`, porque ese flujo valida reservas activas, permite bloquear una/varias/todas las habitaciones y afecta la disponibilidad publica y del formulario de reservas.

## Recomendacion operativa

Usar `estado_habitaciones` para trabajo interno:

- `disponible`: lista para vender o asignar.
- `limpieza`: requiere limpieza antes de venderse.
- `mantenimiento`: requiere reparacion o revision.
- `bloqueada`: senal interna; si debe impedir reservas, crear tambien un bloqueo en `/admin/bloqueos`.
- `ocupada`: senal manual interna; la ocupacion real debe venir de `reservas`.

## Regla futura opcional

Si se decide que `mantenimiento` o `bloqueada` impidan reservas automaticamente, hay que conectar `estado_habitaciones` con:

- `src/lib/room-availability.ts`
- `src/lib/db/reservas.ts`
- formularios de reserva cliente/staff
- catalogo publico

Hasta entonces, el bloqueo real de venta sigue siendo `bloqueos_fechas`.
