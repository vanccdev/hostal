import Image from "next/image";
import Link from "next/link";
import { BedDouble, CalendarDays, CreditCard, FileCheck, ReceiptText, UsersRound } from "lucide-react";
import { ClientCancelReservationDialog } from "@/components/app/ClientCancelReservationDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { getGuestForUser } from "@/lib/db/current-guest";
import { formatReservaEstado } from "@/lib/reserva-estado";
import { getStaySettings } from "@/lib/stay-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseTableQuery, sortableColumnsByTable, type TableQueryInput } from "@/lib/table-server";
import type { Cancelacion, Habitacion, ImgHabitacion, Reserva, Tarifa, Transaccion } from "@/types/database";

type ReservationCardItem = {
  reserva: Reserva;
  habitacion?: Habitacion;
  tarifa?: Tarifa;
  imagen?: ImgHabitacion;
  transacciones: Transaccion[];
  cancelacion?: Cancelacion;
};

const moneyFormatter = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatMoney = (value: number | null | undefined, currency = "BOB") =>
  `${moneyFormatter.format(Number(value ?? 0))} ${currency}`;

const sumApprovedPayments = (transacciones: Transaccion[]) =>
  transacciones
    .filter((transaccion) => transaccion.tipo === "pago" && transaccion.estado_verificacion === "aprobada")
    .reduce((total, transaccion) => total + Number(transaccion.monto), 0);

const latestPayment = (transacciones: Transaccion[]) =>
  [...transacciones].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];

const buildPageHref = (page: number, pageSize: number) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  return `/app/reservas?${params.toString()}`;
};

export default async function ReservasClientePage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  const currentUser = await requirePasswordReady();
  const guest = await getGuestForUser(currentUser.authUserId);
  const supabase = createSupabaseAdminClient();
  const sortableColumns = sortableColumnsByTable.reservas ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultSort: "created_at",
    defaultDir: "desc",
    searchableColumns: [],
    sortableColumns,
  });

  const { data, count } = guest
    ? await supabase
        .from("reservas")
        .select("*", { count: "exact" })
        .eq("huesped_id", guest.id)
        .order(tableQuery.sort as "created_at", { ascending: tableQuery.dir === "asc" })
        .range(tableQuery.from, tableQuery.to)
    : { data: [], count: 0 };
  const reservas = data ?? [];
  const reservaIds = reservas.map((reserva) => reserva.id);
  const habitacionIds = [...new Set(reservas.map((reserva) => reserva.habitacion_id))];
  const tarifaIds = [...new Set(reservas.map((reserva) => reserva.tarifa_id))];
  const [{ data: habitaciones }, { data: tarifas }, { data: imagenes }, { data: transacciones }, { data: cancelaciones }, staySettings] =
    await Promise.all([
      habitacionIds.length > 0
        ? supabase.from("habitaciones").select("id,numero,tipo,piso,capacidad_max,descripcion,activa,created_at,tarifa_id").in("id", habitacionIds)
        : Promise.resolve({ data: [] as Habitacion[] }),
      tarifaIds.length > 0
        ? supabase
            .from("tarifas")
            .select("id,habitacion_tipo,temporada,precio_noche,peso,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
            .in("id", tarifaIds)
        : Promise.resolve({ data: [] as Tarifa[] }),
      habitacionIds.length > 0
        ? supabase.from("img_habitaciones").select("id,habitacion_id,url,created_at").in("habitacion_id", habitacionIds).order("created_at")
        : Promise.resolve({ data: [] as ImgHabitacion[] }),
      reservaIds.length > 0
        ? supabase.from("transacciones").select("*").in("reserva_id", reservaIds).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Transaccion[] }),
      reservaIds.length > 0
        ? supabase.from("cancelaciones").select("*").in("reserva_id", reservaIds).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Cancelacion[] }),
      getStaySettings(supabase),
    ]);
  const habitacionesById = new Map((habitaciones ?? []).map((habitacion) => [habitacion.id, habitacion]));
  const tarifasById = new Map((tarifas ?? []).map((tarifa) => [tarifa.id, tarifa]));
  const firstImageByRoomId = new Map<string, ImgHabitacion>();
  for (const imagen of imagenes ?? []) {
    if (!firstImageByRoomId.has(imagen.habitacion_id)) {
      firstImageByRoomId.set(imagen.habitacion_id, imagen);
    }
  }
  const transaccionesByReservaId = new Map<string, Transaccion[]>();
  for (const transaccion of transacciones ?? []) {
    transaccionesByReservaId.set(transaccion.reserva_id, [
      ...(transaccionesByReservaId.get(transaccion.reserva_id) ?? []),
      transaccion,
    ]);
  }
  const cancelacionesByReservaId = new Map((cancelaciones ?? []).map((cancelacion) => [cancelacion.reserva_id, cancelacion]));
  const items: ReservationCardItem[] = reservas.map((reserva) => ({
    reserva,
    habitacion: habitacionesById.get(reserva.habitacion_id),
    tarifa: tarifasById.get(reserva.tarifa_id),
    imagen: firstImageByRoomId.get(reserva.habitacion_id),
    transacciones: transaccionesByReservaId.get(reserva.id) ?? [],
    cancelacion: cancelacionesByReservaId.get(reserva.id),
  }));
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / tableQuery.pageSize));

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mis reservas</h1>
          <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Detalle de tus reservas, pagos y cancelaciones.</p>
        </div>
        <Button asChild>
          <Link href="/app/reservas/nueva">Nueva reserva</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">No tienes reservas registradas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ReservationCard key={item.reserva.id} item={item} staySettings={staySettings} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-[#d8d4c8] bg-white p-4 text-sm text-[#66736a] dark:border-[#314237] dark:bg-[#18251d] dark:text-[#b7c0b4] sm:flex-row sm:items-center sm:justify-between">
        <span>
          Página {tableQuery.page} de {totalPages}. Mostrando {items.length} de {total} reservas.
        </span>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" aria-disabled={tableQuery.page <= 1}>
            <Link
              href={buildPageHref(Math.max(1, tableQuery.page - 1), tableQuery.pageSize)}
              className={tableQuery.page <= 1 ? "pointer-events-none opacity-50" : undefined}
            >
              Anterior
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" aria-disabled={tableQuery.page >= totalPages}>
            <Link
              href={buildPageHref(Math.min(totalPages, tableQuery.page + 1), tableQuery.pageSize)}
              className={tableQuery.page >= totalPages ? "pointer-events-none opacity-50" : undefined}
            >
              Siguiente
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

const ReservationCard = ({ item, staySettings }: { item: ReservationCardItem; staySettings: Awaited<ReturnType<typeof getStaySettings>> }) => {
  const { reserva, habitacion, tarifa, imagen, transacciones, cancelacion } = item;
  const currency = tarifa?.moneda ?? "BOB";
  const paidAmount = sumApprovedPayments(transacciones);
  const lastPayment = latestPayment(transacciones);
  const canCancel = reserva.estado === "pendiente_pago" || reserva.estado === "confirmada";

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[280px_1fr]">
        <div className="relative min-h-[220px] bg-[#f6f1e6] dark:bg-[#142019] lg:min-h-full">
          {imagen?.url ? (
            <Image
              src={imagen.url}
              alt={`Habitación ${habitacion?.numero ?? reserva.habitacion_id}`}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 280px, 100vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full min-h-[220px] items-center justify-center text-[#66736a] dark:text-[#b7c0b4]">
              <BedDouble className="h-12 w-12" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-normal">Reserva {reserva.codigo_reserva}</h2>
                <Badge variant="secondary">{formatReservaEstado(reserva.estado)}</Badge>
              </div>
              <p className="mt-1 text-sm text-[#66736a] dark:text-[#b7c0b4]">
                Habitación {habitacion?.numero ?? reserva.habitacion_id} · {habitacion?.tipo ?? "Tipo no disponible"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canCancel ? (
                <ClientCancelReservationDialog reserva={reserva} paidAmount={paidAmount} currency={currency} settings={staySettings} />
              ) : null}
              <Button asChild variant="outline" size="sm">
                <Link href={`/app/reservas/${reserva.id}`}>Ver pago</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoBlock icon={CalendarDays} label="Estadía" value={`${formatDate(reserva.fecha_ingreso)} - ${formatDate(reserva.fecha_salida)}`} detail={`${reserva.num_noches} noches`} />
            <InfoBlock icon={UsersRound} label="Huéspedes" value={`${reserva.num_huespedes}`} detail={`Capacidad ${habitacion?.capacidad_max ?? "-"}`} />
            <InfoBlock icon={ReceiptText} label="Total reserva" value={formatMoney(reserva.precio_total, currency)} detail={reserva.precio_ajustado !== null ? `Ajuste ${formatMoney(reserva.precio_ajustado, currency)}` : "Sin ajuste"} />
            <InfoBlock icon={CreditCard} label="Pago aprobado" value={formatMoney(paidAmount, currency)} detail={lastPayment ? `Último: ${lastPayment.estado_verificacion}` : "Sin pagos"} />
          </div>

          <div className="grid gap-3 text-sm lg:grid-cols-3">
            <DetailList
              title="Habitación"
              rows={[
                ["Número", habitacion?.numero ?? "-"],
                ["Tipo", habitacion?.tipo ?? "-"],
                ["Piso", habitacion?.piso?.toString() ?? "-"],
                ["Tarifa noche", tarifa ? formatMoney(tarifa.precio_noche, currency) : "-"],
              ]}
            />
            <DetailList
              title="Horarios"
              rows={[
                ["Check-in", reserva.checkin_programado_at ? formatDateTime(reserva.checkin_programado_at) : "-"],
                ["Check-out", reserva.checkout_programado_at ? formatDateTime(reserva.checkout_programado_at) : "-"],
                ["Creada", formatDateTime(reserva.created_at)],
                ["Canal", reserva.canal_origen],
              ]}
            />
            <DetailList
              title={cancelacion ? "Cancelación" : "Comprobante"}
              rows={
                cancelacion
                  ? [
                      ["Política", cancelacion.politica_aplicada],
                      ["Pagado", formatMoney(cancelacion.monto_pagado_aprobado, currency)],
                      ["Retención", `${cancelacion.retencion_porcentaje_aplicado}%`],
                      ["Monto final hostal", formatMoney(cancelacion.monto_retenido, currency)],
                    ]
                  : [
                      ["Estado pago", lastPayment?.estado_verificacion ?? "Pendiente"],
                      ["Comprobante", lastPayment?.comprobante_url ? "Subido" : "Pendiente"],
                      ["Referencia", lastPayment?.referencia_externa ?? "-"],
                      ["Actualización", lastPayment ? formatDateTime(lastPayment.created_at) : "-"],
                    ]
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const InfoBlock = ({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof FileCheck;
  label: string;
  value: string;
  detail: string;
}) => (
  <div className="rounded-xl border border-[#d8d4c8] bg-[#f8f5ec] p-3 dark:border-[#314237] dark:bg-[#142019]">
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#c7a35a]" aria-hidden="true" />
      <div>
        <p className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{label}</p>
        <p className="mt-1 font-semibold text-[#18221b] dark:text-zinc-100">{value}</p>
        <p className="mt-0.5 text-xs text-[#66736a] dark:text-[#b7c0b4]">{detail}</p>
      </div>
    </div>
  </div>
);

const DetailList = ({ title, rows }: { title: string; rows: Array<[string, string]> }) => (
  <div className="rounded-xl border border-[#d8d4c8] p-3 dark:border-[#314237]">
    <p className="font-semibold text-[#18221b] dark:text-zinc-100">{title}</p>
    <dl className="mt-3 space-y-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-3">
          <dt className="text-[#66736a] dark:text-[#b7c0b4]">{label}</dt>
          <dd className="text-right font-medium text-[#18221b] dark:text-zinc-100">{value}</dd>
        </div>
      ))}
    </dl>
  </div>
);
