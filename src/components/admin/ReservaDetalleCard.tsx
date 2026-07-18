import Image from "next/image";
import Link from "next/link";
import { Banknote, CalendarDays, FileCheck, History, ReceiptText, UserRound } from "lucide-react";
import { verifyReservationProofFormAction } from "@/app/actions/comprobantes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayDocumentNumber } from "@/lib/client-profile";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { formatNotificacionTipo } from "@/lib/notificacion-tipo";
import { formatReservaEstado } from "@/lib/reserva-estado";
import type { UserContact } from "@/lib/auth/user-contact";
import type {
  AuditLog,
  Cancelacion,
  Comprobante,
  Habitacion,
  Huesped,
  ImgHabitacion,
  Notificacion,
  Reserva,
  Tarifa,
  Transaccion,
  Usuario,
} from "@/types/database";

export type ReservaDetalleItem = {
  reserva: Reserva;
  huesped?: Huesped;
  usuarioCliente?: Usuario;
  contactoCliente?: UserContact;
  habitacion?: Habitacion;
  habitacionImagenes: ImgHabitacion[];
  tarifa?: Tarifa;
  registradoPor?: Usuario;
  transacciones: Transaccion[];
  comprobantes: Comprobante[];
  cancelaciones: Cancelacion[];
  notificaciones: Notificacion[];
  auditoria: AuditLog[];
  usuariosById: Map<string, Usuario>;
};

type ReservaDetalleCardProps = {
  item: ReservaDetalleItem;
};

const moneyFormatter = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatMoney = (value: number | null | undefined, currency = "BOB") =>
  value === null || value === undefined ? "-" : `${moneyFormatter.format(Number(value))} ${currency}`;

const textValue = (value: string | number | boolean | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
};

const shortId = (value: string | null | undefined) => value?.slice(0, 8) ?? "-";

const userName = (usuariosById: Map<string, Usuario>, id: string | null | undefined) =>
  id ? usuariosById.get(id)?.nombre ?? shortId(id) : "-";

const statusVariant = (estado: string) => {
  if (estado.includes("cancel") || estado.includes("rechazada") || estado === "no_show") {
    return "destructive";
  }

  if (estado.includes("pendiente") || estado.includes("por_verificar")) {
    return "secondary";
  }

  return "default";
};

const keyValueGridColumns = {
  one: "grid-cols-1",
  two: "grid-cols-1 md:grid-cols-2",
  three: "grid-cols-1 md:grid-cols-3",
} as const;

export const ReservaDetalleCard = ({ item }: ReservaDetalleCardProps) => {
  const {
    reserva,
    huesped,
    usuarioCliente,
    contactoCliente,
    habitacion,
    habitacionImagenes,
    tarifa,
    registradoPor,
    transacciones,
    comprobantes,
    cancelaciones,
    notificaciones,
    auditoria,
    usuariosById,
  } = item;
  const firstImage = habitacionImagenes[0];
  const totalPagado = transacciones
    .filter((transaccion) => transaccion.estado_verificacion === "aprobada" && transaccion.tipo === "pago")
    .reduce((total, transaccion) => total + Number(transaccion.monto), 0);
  const pendingPaymentProof = transacciones.find((transaccion) => transaccion.estado_verificacion === "por_verificar");

  return (
    <Card className="overflow-hidden rounded-lg shadow-none">
      <CardHeader className="gap-4 border-b border-[#ece4d4] dark:border-[#314237] md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="truncate text-xl">{reserva.codigo_reserva}</CardTitle>
            <Badge variant={statusVariant(reserva.estado)}>{formatReservaEstado(reserva.estado)}</Badge>
            <Badge variant="outline">{reserva.canal_origen}</Badge>
          </div>
          <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
            Creada {formatDateTime(reserva.created_at)} por {registradoPor?.nombre ?? shortId(reserva.registrado_por)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm md:min-w-72">
          <Metric label="Noches" value={reserva.num_noches} />
          <Metric label="Total" value={formatMoney(reserva.precio_total, tarifa?.moneda ?? "BOB")} />
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        <div className="grid gap-4">
          <DataPanel icon={CalendarDays} title="Reserva">
            <KeyValueList
              columns="three"
              items={[
                ["Código", reserva.codigo_reserva],
                ["Estado", formatReservaEstado(reserva.estado)],
                ["Canal", reserva.canal_origen],
                ["Ingreso", formatDate(reserva.fecha_ingreso)],
                ["Salida", formatDate(reserva.fecha_salida)],
                ["Check-in prog.", formatDateTime(reserva.checkin_programado_at)],
                ["Check-out prog.", formatDateTime(reserva.checkout_programado_at)],
                ["Noches", reserva.num_noches],
                ["Huéspedes", reserva.num_huespedes],
                ["Total", formatMoney(reserva.precio_total, tarifa?.moneda ?? "BOB")],
                ["Ajuste", reserva.precio_ajustado ? formatMoney(reserva.precio_ajustado, tarifa?.moneda ?? "BOB") : "-"],
                ["Motivo ajuste", reserva.motivo_ajuste],
                ["Notas internas", reserva.notas_internas],
              ]}
            />
          </DataPanel>

          <DataPanel icon={UserRound} title="Cliente y usuario">
            <KeyValueList
              columns="three"
              items={[
                ["Nombre", contactoCliente?.nombre ?? usuarioCliente?.nombre],
                ["Usuario", usuarioCliente?.nombre],
                ["Email", contactoCliente?.email],
                ["Teléfono", contactoCliente?.telefono],
                ["Documento", huesped ? `${huesped.tipo_documento} ${displayDocumentNumber(huesped.numero_documento)}` : undefined],
                ["País", huesped?.pais_origen],
                ["Nacimiento", formatDate(huesped?.fecha_nacimiento)],
                ["Observaciones", huesped?.observaciones],
              ]}
            />
          </DataPanel>
        </div>

        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="overflow-hidden rounded-lg border border-[#ece4d4] bg-[#f8f5ec] dark:border-[#314237] dark:bg-[#142019]">
            <div className="relative aspect-[4/3] bg-[#f6f1e6] dark:bg-[#223229]">
              {firstImage ? (
                <Image
                  src={firstImage.url}
                  alt={`Habitación ${habitacion?.numero ?? ""}`}
                  fill
                  sizes="(min-width: 1280px) 360px, 100vw"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-medium text-[#66736a] dark:text-[#b7c0b4]">
                  Sin foto de habitación
                </div>
              )}
              <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                <Badge variant={habitacion?.activa === false ? "destructive" : "secondary"}>
                  {habitacion?.activa === false ? "Inactiva" : "Activa"}
                </Badge>
                <Badge variant="outline">{habitacionImagenes.length} fotos</Badge>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">Habitación elegida</p>
                <h3 className="mt-1 text-2xl font-semibold text-[#18221b] dark:text-zinc-100">
                  {habitacion ? `Habitación ${habitacion.numero}` : "Sin habitación"}
                </h3>
                <p className="mt-1 text-sm font-medium text-[#66736a] dark:text-[#b7c0b4]">
                  {textValue(habitacion?.tipo)} · Piso {textValue(habitacion?.piso)} · {textValue(habitacion?.capacidad_max)} huéspedes
                </p>
              </div>
              <KeyValueList
                columns="two"
                items={[
                  ["Capacidad", habitacion?.capacidad_max],
                  ["Estado", habitacion?.activa === false ? "Inactiva" : "Activa"],
                  ["Descripción", habitacion?.descripcion],
                ]}
              />
            </div>
          </aside>

          <div className="grid gap-4 lg:grid-cols-2">
            <DataPanel icon={ReceiptText} title="Tarifa aplicada">
              <KeyValueList
                columns="two"
                items={[
                  ["Tipo habitación", tarifa?.habitacion_tipo],
                  ["Temporada", tarifa?.temporada],
                  ["Precio noche", formatMoney(tarifa?.precio_noche, tarifa?.moneda ?? "BOB")],
                  ["Moneda", tarifa?.moneda],
                  ["Peso", tarifa?.peso],
                  ["Vigente desde", formatDate(tarifa?.vigente_desde)],
                  ["Vigente hasta", formatDate(tarifa?.vigente_hasta)],
                  ["Activa", tarifa?.activa === false ? "No" : "Sí"],
                  ["Creada por", userName(usuariosById, tarifa?.created_by)],
                ]}
              />
            </DataPanel>

            <DataPanel icon={Banknote} title="Resumen financiero">
              <KeyValueList
                columns="two"
                items={[
                  ["Total reserva", formatMoney(reserva.precio_total, tarifa?.moneda ?? "BOB")],
                  ["Pagado aprobado", formatMoney(totalPagado, tarifa?.moneda ?? "BOB")],
                  ["Transacciones", transacciones.length],
                  ["Comprobantes", comprobantes.length],
                  ["Cancelaciones", cancelaciones.length],
                  ["Registrado por", registradoPor?.nombre ?? shortId(reserva.registrado_por)],
                  ["Creación", formatDateTime(reserva.created_at)],
                  ["Actualización", formatDateTime(reserva.updated_at)],
                ]}
              />
            </DataPanel>

            {pendingPaymentProof ? (
              <DataPanel icon={FileCheck} title="Verificación pendiente">
                <div className="space-y-3 text-sm">
                  <p className="text-[#66736a] dark:text-[#b7c0b4]">
                    Revisa el depósito en el banco antes de confirmar o rechazar esta reserva.
                  </p>
                  {pendingPaymentProof.comprobante_url ? (
                    <Button asChild variant="outline">
                      <a href={pendingPaymentProof.comprobante_url} target="_blank" rel="noreferrer">
                        Ver comprobante
                      </a>
                    </Button>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <form action={verifyReservationProofFormAction}>
                      <input type="hidden" name="reservaId" value={reserva.id} />
                      <input type="hidden" name="decision" value="aprobar" />
                      <Button type="submit">Confirmar reserva</Button>
                    </form>
                    <form action={verifyReservationProofFormAction}>
                      <input type="hidden" name="reservaId" value={reserva.id} />
                      <input type="hidden" name="decision" value="rechazar" />
                      <Button type="submit" variant="destructive">Rechazar comprobante</Button>
                    </form>
                  </div>
                </div>
              </DataPanel>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <RelatedList
            icon={Banknote}
            title="Transacciones"
            empty="Sin transacciones."
            items={transacciones.map((transaccion) => ({
              id: transaccion.id,
              title: formatMoney(transaccion.monto, transaccion.moneda ?? "BOB"),
              badge: transaccion.estado_verificacion,
              lines: [
                `${transaccion.tipo} · ${transaccion.metodo_pago}`,
                `Referencia: ${textValue(transaccion.referencia_externa)}`,
                `Comprobante URL: ${textValue(transaccion.comprobante_url)}`,
                `Verificado por: ${userName(usuariosById, transaccion.verificado_por)}`,
                `Verificado: ${formatDateTime(transaccion.verificado_at)}`,
                `Notas: ${textValue(transaccion.notas_admin)}`,
                formatDateTime(transaccion.created_at),
              ],
            }))}
            footer={transacciones.length > 0 ? `Pagado aprobado: ${formatMoney(totalPagado, tarifa?.moneda ?? "BOB")}` : undefined}
          />
          <RelatedList
            icon={FileCheck}
            title="Comprobantes"
            empty="Sin comprobantes."
            items={comprobantes.map((comprobante) => ({
              id: comprobante.id,
              title: comprobante.numero_comprobante,
              lines: [
                `Emitido: ${formatDateTime(comprobante.emitido_at)}`,
                `PDF: ${textValue(comprobante.pdf_url)}`,
              ],
            }))}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <RelatedList
            icon={History}
            title="Cancelaciones y notificaciones"
            empty="Sin cancelaciones ni avisos."
            items={[
              ...cancelaciones.map((cancelacion) => ({
                id: `cancelacion-${cancelacion.id}`,
                title: cancelacion.politica_aplicada,
                badge: "cancelación",
                lines: [
                  cancelacion.motivo,
                  `Horas anticipación: ${cancelacion.horas_anticipacion}`,
                  `Reembolso: ${formatMoney(cancelacion.monto_reembolso, tarifa?.moneda ?? "BOB")}`,
                  `Gestionado por: ${userName(usuariosById, cancelacion.gestionado_por)}`,
                  `Creada: ${formatDateTime(cancelacion.created_at)}`,
                ],
              })),
              ...notificaciones.map((notificacion) => ({
                id: `notificacion-${notificacion.id}`,
                title: formatNotificacionTipo(notificacion.tipo),
                badge: notificacion.leida ? "leída" : "pendiente",
                lines: [
                  notificacion.mensaje,
                  `Rol: ${notificacion.destinatario_rol}`,
                  `Creada: ${formatDateTime(notificacion.created_at)}`,
                ],
              })),
            ]}
          />
          <RelatedList
            icon={History}
            title="Auditoría"
            empty="Sin eventos de auditoría."
            items={auditoria.map((audit) => ({
              id: `audit-${audit.id}`,
              title: audit.accion,
              badge: "auditoría",
              lines: [
                `Tabla: ${audit.tabla_afectada}`,
                `Usuario: ${userName(usuariosById, audit.usuario_id)}`,
                `IP: ${textValue(audit.ip_origen)}`,
                `Datos nuevos: ${textValue(audit.datos_nuevos ? JSON.stringify(audit.datos_nuevos) : null)}`,
                `Creado: ${formatDateTime(audit.created_at)}`,
              ],
            }))}
          />
        </div>

        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/reservas?q=${encodeURIComponent(reserva.codigo_reserva)}`}>Ver en listado</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Metric = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-lg border border-[#ece4d4] px-3 py-2 dark:border-[#314237]">
    <p className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{label}</p>
    <p className="mt-1 truncate text-sm font-semibold text-[#18221b] dark:text-zinc-100">{value}</p>
  </div>
);

const DataPanel = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="h-full rounded-lg border border-[#ece4d4] p-4 dark:border-[#314237]">
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#c7a35a]" aria-hidden="true" />
      <h3 className="text-sm font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{title}</h3>
    </div>
    {children}
  </section>
);

const KeyValueList = ({
  items,
  columns = "one",
}: {
  items: [string, string | number | boolean | null | undefined][];
  columns?: "one" | "two" | "three";
}) => (
  <dl className={`grid gap-3 ${keyValueGridColumns[columns]}`}>
    {items.map(([label, value]) => (
      <div key={label} className="min-w-0">
        <dt className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{label}</dt>
        <dd className="mt-1 break-words text-sm font-medium text-[#18221b] dark:text-zinc-100">{textValue(value)}</dd>
      </div>
    ))}
  </dl>
);

type RelatedItem = {
  id: string;
  title: string;
  badge?: string;
  lines: string[];
};

const RelatedList = ({
  icon: Icon,
  title,
  empty,
  items,
  footer,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  empty: string;
  items: RelatedItem[];
  footer?: string;
}) => (
  <section className="rounded-lg border border-[#ece4d4] p-4 dark:border-[#314237]">
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#c7a35a]" aria-hidden="true" />
      <h3 className="text-sm font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{title}</h3>
    </div>
    {items.length === 0 ? (
      <p className="text-sm font-medium text-[#66736a] dark:text-[#b7c0b4]">{empty}</p>
    ) : (
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="border-b border-[#ece4d4] pb-3 last:border-b-0 last:pb-0 dark:border-[#314237]">
            <div className="flex items-start justify-between gap-3">
              <p className="break-words text-sm font-semibold text-[#18221b] dark:text-zinc-100">{item.title}</p>
              {item.badge ? <Badge variant={statusVariant(item.badge)}>{item.badge}</Badge> : null}
            </div>
            <div className="mt-2 space-y-1">
              {item.lines.map((line) => (
                <p key={line} className="break-words text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
                  {line}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    )}
    {footer ? <p className="mt-3 text-sm font-semibold text-[#18221b] dark:text-zinc-100">{footer}</p> : null}
  </section>
);
