import Image from "next/image";
import Link from "next/link";
import {
  Banknote,
  BedDouble,
  CalendarDays,
  FileCheck,
  History,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { verifyReservationProofFormAction } from "@/app/actions/comprobantes";
import { CancelReservationDialog } from "@/components/admin/CancelReservationDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { displayDocumentNumber } from "@/lib/client-profile";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { formatNotificacionTipo } from "@/lib/notificacion-tipo";
import { formatReservaEstado } from "@/lib/reserva-estado";
import type { UserContact } from "@/lib/auth/user-contact";
import type { StaySettings } from "@/lib/stay-settings";
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
  staySettings: StaySettings;
};

type ReservaDetalleCardProps = {
  item: ReservaDetalleItem;
};

type DetailItem = {
  id: string;
  title: string;
  badge?: string;
  rows: Array<[string, string | number | boolean | null | undefined]>;
  href?: string | null;
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
    staySettings,
  } = item;
  const firstImage = habitacionImagenes[0];
  const currency = tarifa?.moneda ?? "BOB";
  const totalPagado = transacciones
    .filter((transaccion) => transaccion.estado_verificacion === "aprobada" && transaccion.tipo === "pago")
    .reduce((total, transaccion) => total + Number(transaccion.monto), 0);
  const pendingPaymentProof = transacciones.find((transaccion) => transaccion.estado_verificacion === "por_verificar");
  const clienteNombre = contactoCliente?.nombre ?? usuarioCliente?.nombre ?? "Cliente sin nombre";
  const clienteContacto = [contactoCliente?.email, contactoCliente?.telefono].filter(Boolean).join(" · ") || "Sin contacto";
  const reservationRows: Array<[string, string | number | boolean | null | undefined]> = [
    ["Código", reserva.codigo_reserva],
    ["Estado", formatReservaEstado(reserva.estado)],
    ["Canal", reserva.canal_origen],
    ["Ingreso", formatDate(reserva.fecha_ingreso)],
    ["Salida", formatDate(reserva.fecha_salida)],
    ["Check-in programado", formatDateTime(reserva.checkin_programado_at)],
    ["Check-out programado", formatDateTime(reserva.checkout_programado_at)],
    ["Noches", reserva.num_noches],
    ["Huéspedes", reserva.num_huespedes],
    ["Total", formatMoney(reserva.precio_total, currency)],
    ["Ajuste", reserva.precio_ajustado ? formatMoney(reserva.precio_ajustado, currency) : "-"],
    ["Motivo ajuste", reserva.motivo_ajuste],
    ["Notas internas", reserva.notas_internas],
    ["Registrado por", registradoPor?.nombre ?? shortId(reserva.registrado_por)],
    ["Creada", formatDateTime(reserva.created_at)],
    ["Actualizada", formatDateTime(reserva.updated_at)],
  ];
  const clientRows: Array<[string, string | number | boolean | null | undefined]> = [
    ["Nombre", clienteNombre],
    ["Usuario", usuarioCliente?.nombre],
    ["Email", contactoCliente?.email],
    ["Teléfono", contactoCliente?.telefono],
    ["Documento", huesped ? `${huesped.tipo_documento} ${displayDocumentNumber(huesped.numero_documento)}` : undefined],
    ["País", huesped?.pais_origen],
    ["Nacimiento", formatDate(huesped?.fecha_nacimiento)],
    ["Observaciones", huesped?.observaciones],
  ];
  const roomRows: Array<[string, string | number | boolean | null | undefined]> = [
    ["Número", habitacion?.numero],
    ["Tipo", habitacion?.tipo],
    ["Piso", habitacion?.piso],
    ["Capacidad", habitacion?.capacidad_max],
    ["Estado", habitacion?.activa === false ? "Inactiva" : "Activa"],
    ["Descripción", habitacion?.descripcion],
  ];
  const rateRows: Array<[string, string | number | boolean | null | undefined]> = [
    ["Tipo habitación", tarifa?.habitacion_tipo],
    ["Temporada", tarifa?.temporada],
    ["Precio noche", formatMoney(tarifa?.precio_noche, currency)],
    ["Moneda", tarifa?.moneda],
    ["Peso", tarifa?.peso],
    ["Vigente desde", formatDate(tarifa?.vigente_desde)],
    ["Vigente hasta", formatDate(tarifa?.vigente_hasta)],
    ["Activa", tarifa?.activa === false ? "No" : "Sí"],
    ["Creada por", userName(usuariosById, tarifa?.created_by)],
  ];
  const transactionItems: DetailItem[] = transacciones.map((transaccion) => ({
    id: transaccion.id,
    title: formatMoney(transaccion.monto, transaccion.moneda ?? currency),
    badge: transaccion.estado_verificacion,
    href: transaccion.comprobante_url,
    rows: [
      ["Tipo", transaccion.tipo],
      ["Método", transaccion.metodo_pago],
      ["Referencia", transaccion.referencia_externa],
      ["Verificado por", userName(usuariosById, transaccion.verificado_por)],
      ["Verificado", formatDateTime(transaccion.verificado_at)],
      ["Notas", transaccion.notas_admin],
      ["Creado", formatDateTime(transaccion.created_at)],
    ],
  }));
  const proofItems: DetailItem[] = comprobantes.map((comprobante) => ({
    id: comprobante.id,
    title: comprobante.numero_comprobante,
    href: comprobante.pdf_url,
    rows: [
      ["Emitido", formatDateTime(comprobante.emitido_at)],
      ["PDF", comprobante.pdf_url],
      ["Subido por", userName(usuariosById, comprobante.uploaded_by)],
      ["Creado", formatDateTime(comprobante.created_at)],
    ],
  }));
  const cancellationItems: DetailItem[] = cancelaciones.map((cancelacion) => ({
    id: cancelacion.id,
    title: cancelacion.politica_aplicada,
    badge: "cancelación",
    rows: [
      ["Motivo", cancelacion.motivo],
      ["Horas anticipación", cancelacion.horas_anticipacion],
      ["Pagado aprobado", formatMoney(cancelacion.monto_pagado_aprobado, currency)],
      ["Retención aplicada", `${cancelacion.retencion_porcentaje_aplicado}%`],
      ["Monto final hostal", formatMoney(cancelacion.monto_retenido, currency)],
      ["Monto no retenido", formatMoney(cancelacion.monto_reembolso, currency)],
      ["Gestionado por", userName(usuariosById, cancelacion.gestionado_por)],
      ["Creada", formatDateTime(cancelacion.created_at)],
    ],
  }));
  const notificationItems: DetailItem[] = notificaciones.map((notificacion) => ({
    id: notificacion.id,
    title: formatNotificacionTipo(notificacion.tipo),
    badge: notificacion.leida ? "leída" : "pendiente",
    rows: [
      ["Mensaje", notificacion.mensaje],
      ["Rol", notificacion.destinatario_rol],
      ["Creada", formatDateTime(notificacion.created_at)],
    ],
  }));
  const auditItems: DetailItem[] = auditoria.map((audit) => ({
    id: audit.id,
    title: audit.accion,
    badge: "auditoría",
    rows: [
      ["Tabla", audit.tabla_afectada],
      ["Usuario", userName(usuariosById, audit.usuario_id)],
      ["IP", audit.ip_origen],
      ["Datos nuevos", audit.datos_nuevos ? JSON.stringify(audit.datos_nuevos) : null],
      ["Creado", formatDateTime(audit.created_at)],
    ],
  }));

  return (
    <Card className="overflow-hidden rounded-xl border-l-4 border-l-[#c7a35a] shadow-none">
      <CardContent className="p-0">
        <div className="grid gap-0 xl:grid-cols-[260px_1fr]">
          <div className="relative min-h-[210px] bg-[#f6f1e6] dark:bg-[#142019] xl:min-h-full">
            {firstImage ? (
              <Image
                src={firstImage.url}
                alt={`Habitación ${habitacion?.numero ?? ""}`}
                fill
                sizes="(min-width: 1280px) 260px, 100vw"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full min-h-[210px] items-center justify-center text-[#66736a] dark:text-[#b7c0b4]">
                <BedDouble className="h-12 w-12" aria-hidden="true" />
              </div>
            )}
            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              <Badge variant={statusVariant(reserva.estado)}>{formatReservaEstado(reserva.estado)}</Badge>
              <Badge variant="outline">{reserva.codigo_reserva}</Badge>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-normal text-[#18221b] dark:text-zinc-100">
                    {reserva.codigo_reserva}
                  </h2>
                  <Badge variant="secondary">{reserva.canal_origen}</Badge>
                  {pendingPaymentProof ? <Badge variant="secondary">Pago por verificar</Badge> : null}
                </div>
                <p className="mt-1 text-sm font-medium text-[#66736a] dark:text-[#b7c0b4]">
                  {clienteNombre} · Habitación {habitacion?.numero ?? shortId(reserva.habitacion_id)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CancelReservationDialog reserva={reserva} paidAmount={totalPagado} currency={currency} settings={staySettings} />
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/reservas?q=${encodeURIComponent(reserva.codigo_reserva)}`}>Listado</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric icon={CalendarDays} label="Estadía" value={`${formatDate(reserva.fecha_ingreso)} - ${formatDate(reserva.fecha_salida)}`} detail={`${reserva.num_noches} noches`} />
              <Metric icon={ReceiptText} label="Total" value={formatMoney(reserva.precio_total, currency)} detail={reserva.precio_ajustado ? `Ajuste ${formatMoney(reserva.precio_ajustado, currency)}` : "Sin ajuste"} />
              <Metric icon={Banknote} label="Pagado" value={formatMoney(totalPagado, currency)} detail={`${transacciones.length} transacciones`} />
              <Metric icon={FileCheck} label="Seguimiento" value={`${comprobantes.length} comp.`} detail={`${cancelaciones.length} canc. · ${notificaciones.length} notif.`} />
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <SummaryPanel icon={UserRound} title="Cliente" main={clienteNombre} secondary={clienteContacto} rows={clientRows.slice(4, 6)} />
              <SummaryPanel
                icon={BedDouble}
                title="Habitación"
                main={habitacion ? `Habitación ${habitacion.numero}` : "Sin habitación"}
                secondary={`${textValue(habitacion?.tipo)} · Piso ${textValue(habitacion?.piso)} · ${textValue(habitacion?.capacidad_max)} huéspedes`}
                rows={[
                  ["Fotos", habitacionImagenes.length],
                  ["Tarifa noche", formatMoney(tarifa?.precio_noche, currency)],
                ]}
              />
              <SummaryPanel
                icon={ShieldCheck}
                title="Operación"
                main={registradoPor?.nombre ?? shortId(reserva.registrado_por)}
                secondary={`Creada ${formatDateTime(reserva.created_at)}`}
                rows={[
                  ["Check-in", formatDateTime(reserva.checkin_programado_at)],
                  ["Check-out", formatDateTime(reserva.checkout_programado_at)],
                ]}
              />
            </div>

            {pendingPaymentProof ? (
              <div className="flex flex-col gap-3 rounded-xl border border-[#d8d4c8] bg-[#f8f5ec] p-3 dark:border-[#314237] dark:bg-[#142019] lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#18221b] dark:text-zinc-100">Comprobante pendiente de verificación</p>
                  <p className="text-xs text-[#66736a] dark:text-[#b7c0b4]">
                    Revisa el depósito antes de confirmar o rechazar.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingPaymentProof.comprobante_url ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={pendingPaymentProof.comprobante_url} target="_blank" rel="noreferrer">
                        Ver comprobante
                      </a>
                    </Button>
                  ) : null}
                  <form action={verifyReservationProofFormAction}>
                    <input type="hidden" name="reservaId" value={reserva.id} />
                    <input type="hidden" name="decision" value="aprobar" />
                    <Button type="submit" size="sm">Confirmar</Button>
                  </form>
                  <form action={verifyReservationProofFormAction}>
                    <input type="hidden" name="reservaId" value={reserva.id} />
                    <input type="hidden" name="decision" value="rechazar" />
                    <Button type="submit" variant="destructive" size="sm">Rechazar</Button>
                  </form>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <DetailsDialog icon={CalendarDays} title="Reserva" description={reserva.codigo_reserva} rows={reservationRows} />
              <DetailsDialog icon={UserRound} title="Cliente" description={clienteNombre} rows={clientRows} />
              <DetailsDialog icon={BedDouble} title="Habitación y tarifa" description={habitacion ? `Habitación ${habitacion.numero}` : "Sin habitación"} rows={[...roomRows, ...rateRows]} />
              <ListDialog icon={Banknote} title="Transacciones" description={`${transacciones.length} registros`} empty="Sin transacciones." items={transactionItems} />
              <ListDialog icon={FileCheck} title="Comprobantes" description={`${comprobantes.length} registros`} empty="Sin comprobantes." items={proofItems} />
              <ListDialog icon={History} title="Cancelaciones" description={`${cancelaciones.length} registros`} empty="Sin cancelaciones." items={cancellationItems} />
              <ListDialog icon={ReceiptText} title="Notificaciones" description={`${notificaciones.length} avisos`} empty="Sin notificaciones." items={notificationItems} />
              <ListDialog icon={ShieldCheck} title="Auditoría" description={`${auditoria.length} eventos`} empty="Sin auditoría." items={auditItems} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Metric = ({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) => (
  <div className="rounded-xl border border-[#ece4d4] bg-white px-3 py-3 dark:border-[#314237] dark:bg-[#18251d]">
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#c7a35a]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-[#18221b] dark:text-zinc-100">{value}</p>
        <p className="mt-0.5 truncate text-xs text-[#66736a] dark:text-[#b7c0b4]">{detail}</p>
      </div>
    </div>
  </div>
);

const SummaryPanel = ({
  icon: Icon,
  title,
  main,
  secondary,
  rows,
}: {
  icon: LucideIcon;
  title: string;
  main: string;
  secondary: string;
  rows: Array<[string, string | number | boolean | null | undefined]>;
}) => (
  <section className="rounded-xl border border-[#ece4d4] p-3 dark:border-[#314237]">
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#c7a35a]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{title}</p>
        <p className="mt-1 truncate text-sm font-semibold text-[#18221b] dark:text-zinc-100">{main}</p>
        <p className="mt-0.5 truncate text-xs text-[#66736a] dark:text-[#b7c0b4]">{secondary}</p>
      </div>
    </div>
    <KeyValueList items={rows} className="mt-3 grid-cols-2" />
  </section>
);

const DetailsDialog = ({
  icon: Icon,
  title,
  description,
  rows,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  rows: Array<[string, string | number | boolean | null | undefined]>;
}) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button type="button" variant="outline" size="sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <KeyValueList items={rows} className="grid-cols-1 sm:grid-cols-2" />
    </DialogContent>
  </Dialog>
);

const ListDialog = ({
  icon: Icon,
  title,
  description,
  empty,
  items,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  empty: string;
  items: DetailItem[];
}) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button type="button" variant="outline" size="sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {items.length === 0 ? (
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">{empty}</p>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-[#ece4d4] p-3 dark:border-[#314237]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-[#18221b] dark:text-zinc-100">{item.title}</p>
                {item.badge ? <Badge variant={statusVariant(item.badge)}>{item.badge}</Badge> : null}
              </div>
              <KeyValueList items={item.rows} className="mt-3 grid-cols-1 sm:grid-cols-2" />
              {item.href ? (
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <a href={item.href} target="_blank" rel="noreferrer">
                    Abrir archivo
                  </a>
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </DialogContent>
  </Dialog>
);

const KeyValueList = ({
  items,
  className = "grid-cols-1",
}: {
  items: Array<[string, string | number | boolean | null | undefined]>;
  className?: string;
}) => (
  <dl className={`grid gap-3 ${className}`}>
    {items.map(([label, value]) => (
      <div key={label} className="min-w-0">
        <dt className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{label}</dt>
        <dd className="mt-1 break-words text-sm font-medium text-[#18221b] dark:text-zinc-100">{textValue(value)}</dd>
      </div>
    ))}
  </dl>
);
