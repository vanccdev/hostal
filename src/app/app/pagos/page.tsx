import Image from "next/image";
import Link from "next/link";
import { BedDouble, CalendarDays, CreditCard, ExternalLink, FileCheck, ReceiptText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { getGuestForUser } from "@/lib/db/current-guest";
import { paymentMethodLabel } from "@/lib/payment-method";
import { formatReservaEstado } from "@/lib/reserva-estado";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseTableQuery, sortableColumnsByTable, type TableQueryInput } from "@/lib/table-server";
import type { Comprobante, Habitacion, ImgHabitacion, Reserva, Tarifa, Transaccion } from "@/types/database";

type PaymentCardItem = {
  transaccion: Transaccion;
  reserva?: Reserva;
  habitacion?: Habitacion;
  tarifa?: Tarifa;
  imagen?: ImgHabitacion;
  comprobante?: Comprobante;
};

const moneyFormatter = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatMoney = (value: number | null | undefined, currency = "BOB") =>
  `${moneyFormatter.format(Number(value ?? 0))} ${currency}`;

const paymentStateLabel = (state: string | null | undefined) => {
  if (state === "aprobada") return "Aprobado";
  if (state === "rechazada") return "Rechazado";
  if (state === "por_verificar") return "Por verificar";

  return state ?? "Pendiente";
};

const paymentStateVariant = (state: string | null | undefined) => {
  if (state === "aprobada") return "default";
  if (state === "rechazada") return "destructive";

  return "secondary";
};

const buildPageHref = (page: number, pageSize: number) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  return `/app/pagos?${params.toString()}`;
};

export default async function PagosPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  const currentUser = await requirePasswordReady();
  const guest = await getGuestForUser(currentUser.authUserId);
  const supabase = createSupabaseAdminClient();
  const sortableColumns = sortableColumnsByTable.transacciones ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultSort: "created_at",
    defaultDir: "desc",
    searchableColumns: [],
    sortableColumns,
  });
  const { data: guestReservations } = guest
    ? await supabase.from("reservas").select("*").eq("huesped_id", guest.id)
    : { data: [] };
  const reservations = guestReservations ?? [];
  const reservationIds = reservations.map((reservation) => reservation.id);
  const { data, count } =
    reservationIds.length > 0
      ? await supabase
          .from("transacciones")
          .select("*", { count: "exact" })
          .in("reserva_id", reservationIds)
          .order(tableQuery.sort as "created_at", { ascending: tableQuery.dir === "asc" })
          .range(tableQuery.from, tableQuery.to)
      : { data: [], count: 0 };
  const transacciones = data ?? [];
  const visibleReservationIds = [...new Set(transacciones.map((transaccion) => transaccion.reserva_id))];
  const visibleReservations = reservations.filter((reservation) => visibleReservationIds.includes(reservation.id));
  const habitacionIds = [...new Set(visibleReservations.map((reservation) => reservation.habitacion_id))];
  const tarifaIds = [...new Set(visibleReservations.map((reservation) => reservation.tarifa_id))];
  const transaccionIds = transacciones.map((transaccion) => transaccion.id);
  const [{ data: habitaciones }, { data: tarifas }, { data: imagenes }, { data: comprobantes }] = await Promise.all([
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
    transaccionIds.length > 0
      ? supabase.from("comprobantes").select("*").in("transaccion_id", transaccionIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Comprobante[] }),
  ]);
  const reservationsById = new Map(visibleReservations.map((reservation) => [reservation.id, reservation]));
  const habitacionesById = new Map((habitaciones ?? []).map((habitacion) => [habitacion.id, habitacion]));
  const tarifasById = new Map((tarifas ?? []).map((tarifa) => [tarifa.id, tarifa]));
  const comprobantesByTransactionId = new Map((comprobantes ?? []).map((comprobante) => [comprobante.transaccion_id, comprobante]));
  const firstImageByRoomId = new Map<string, ImgHabitacion>();
  for (const imagen of imagenes ?? []) {
    if (!firstImageByRoomId.has(imagen.habitacion_id)) {
      firstImageByRoomId.set(imagen.habitacion_id, imagen);
    }
  }
  const items: PaymentCardItem[] = transacciones.map((transaccion) => {
    const reserva = reservationsById.get(transaccion.reserva_id);

    return {
      transaccion,
      reserva,
      habitacion: reserva ? habitacionesById.get(reserva.habitacion_id) : undefined,
      tarifa: reserva ? tarifasById.get(reserva.tarifa_id) : undefined,
      imagen: reserva ? firstImageByRoomId.get(reserva.habitacion_id) : undefined,
      comprobante: comprobantesByTransactionId.get(transaccion.id),
    };
  });
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / tableQuery.pageSize));

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pagos</h1>
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Pagos y comprobantes asociados a tus reservas.</p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">No hay pagos registrados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <PaymentCard key={item.transaccion.id} item={item} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-[#d8d4c8] bg-white p-4 text-sm text-[#66736a] dark:border-[#314237] dark:bg-[#18251d] dark:text-[#b7c0b4] sm:flex-row sm:items-center sm:justify-between">
        <span>
          Página {tableQuery.page} de {totalPages}. Mostrando {items.length} de {total} pagos.
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

const PaymentCard = ({ item }: { item: PaymentCardItem }) => {
  const { transaccion, reserva, habitacion, tarifa, imagen, comprobante } = item;
  const currency = transaccion.moneda ?? tarifa?.moneda ?? "BOB";
  const proofUrl = transaccion.comprobante_url ?? comprobante?.pdf_url ?? null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[280px_1fr]">
        <div className="relative min-h-[220px] bg-[#f6f1e6] dark:bg-[#142019] lg:min-h-full">
          {imagen?.url ? (
            <Image
              src={imagen.url}
              alt={`Habitación ${habitacion?.numero ?? reserva?.habitacion_id ?? ""}`}
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
                <h2 className="text-xl font-semibold tracking-normal">{formatMoney(transaccion.monto, currency)}</h2>
                <Badge variant={paymentStateVariant(transaccion.estado_verificacion)}>
                  {paymentStateLabel(transaccion.estado_verificacion)}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-[#66736a] dark:text-[#b7c0b4]">
                Reserva {reserva?.codigo_reserva ?? transaccion.reserva_id} · Habitación {habitacion?.numero ?? reserva?.habitacion_id ?? "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {proofUrl ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={proofUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Ver comprobante
                  </Link>
                </Button>
              ) : null}
              {reserva ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/app/reservas/${reserva.id}`}>Ver reserva</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoBlock icon={CreditCard} label="Método" value={paymentMethodLabel(transaccion.metodo_pago)} detail={`Tipo ${transaccion.tipo}`} />
            <InfoBlock icon={FileCheck} label="Verificación" value={paymentStateLabel(transaccion.estado_verificacion)} detail={transaccion.verificado_at ? formatDateTime(transaccion.verificado_at) : "Sin verificación"} />
            <InfoBlock icon={CalendarDays} label="Reserva" value={reserva ? `${formatDate(reserva.fecha_ingreso)} - ${formatDate(reserva.fecha_salida)}` : "-"} detail={reserva ? formatReservaEstado(reserva.estado) : "Sin reserva"} />
            <InfoBlock icon={ReceiptText} label="Referencia" value={transaccion.referencia_externa ?? comprobante?.numero_comprobante ?? "-"} detail={formatDateTime(transaccion.created_at)} />
          </div>

          <div className="grid gap-3 text-sm lg:grid-cols-3">
            <DetailList
              title="Pago"
              rows={[
                ["Monto", formatMoney(transaccion.monto, currency)],
                ["Estado", paymentStateLabel(transaccion.estado_verificacion)],
                ["Método", paymentMethodLabel(transaccion.metodo_pago)],
                ["Creado", formatDateTime(transaccion.created_at)],
              ]}
            />
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
              title="Comprobante"
              rows={[
                ["Archivo", proofUrl ? "Subido" : "Pendiente"],
                ["Número", comprobante?.numero_comprobante ?? transaccion.referencia_externa ?? "-"],
                ["Emitido", comprobante?.emitido_at ? formatDateTime(comprobante.emitido_at) : "-"],
                ["Notas", transaccion.notas_admin ?? "-"],
              ]}
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
  icon: LucideIcon;
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
