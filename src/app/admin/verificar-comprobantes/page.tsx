import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Banknote, BedDouble, CalendarDays, FileCheck2, FileText, UserRound } from "lucide-react";
import { ComprobanteVerificationActions } from "@/components/admin/ComprobanteVerificationActions";
import { RealtimePaymentVerificationRefresh } from "@/components/admin/RealtimePaymentVerificationRefresh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayDocumentNumber } from "@/lib/client-profile";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { formatReservaEstado } from "@/lib/reserva-estado";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { userContactsById } from "@/lib/auth/user-contact";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Comprobante, Habitacion, Huesped, Reserva, Transaccion, Usuario } from "@/types/database";

type VerifySearchParams = {
  page?: string | string[];
};

type VerificationItem = {
  transaccion: Transaccion;
  reserva?: Reserva;
  comprobante?: Comprobante;
  huesped?: Huesped;
  usuario?: Usuario;
  contacto?: { nombre: string; email: string | null; telefono: string | null };
  habitacion?: Habitacion;
};

const pageSize = 8;

const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const compactIds = (ids: (string | null | undefined)[]) => Array.from(new Set(ids.filter((id): id is string => Boolean(id))));

const byId = <T extends { id: string }>(items: T[] | null | undefined) =>
  new Map((items ?? []).map((item) => [item.id, item]));

const byTransaccionId = (items: Comprobante[] | null | undefined) => {
  const grouped = new Map<string, Comprobante>();

  for (const item of items ?? []) {
    grouped.set(item.transaccion_id, item);
  }

  return grouped;
};

const moneyFormatter = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatMoney = (value: number | null | undefined, currency = "BOB") =>
  value === null || value === undefined ? "-" : `${moneyFormatter.format(Number(value))} ${currency}`;

const isPdfUrl = (url: string) => url.toLowerCase().split("?")[0].endsWith(".pdf");

const pageHref = (page: number) => `/admin/verificar-comprobantes?page=${page}`;

export default async function VerifyComprobantesPage({
  searchParams,
}: {
  searchParams: Promise<VerifySearchParams>;
}) {
  await requireAdminModule("comprobantes");

  const params = await searchParams;
  const page = positiveInteger(firstValue(params.page), 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = createSupabaseAdminClient();

  const { data: transacciones, count } = await supabase
    .from("transacciones")
    .select("*", { count: "exact" })
    .eq("estado_verificacion", "por_verificar")
    .eq("tipo", "pago")
    .not("comprobante_url", "is", null)
    .order("created_at", { ascending: true })
    .range(from, to);

  const transactionRows = transacciones ?? [];
  const reservaIds = compactIds(transactionRows.map((transaccion) => transaccion.reserva_id));
  const transaccionIds = transactionRows.map((transaccion) => transaccion.id);

  const [{ data: reservas }, { data: comprobantes }] = await Promise.all([
    reservaIds.length > 0 ? supabase.from("reservas").select("*").in("id", reservaIds) : Promise.resolve({ data: [] as Reserva[] }),
    transaccionIds.length > 0
      ? supabase.from("comprobantes").select("*").in("transaccion_id", transaccionIds).order("emitido_at", { ascending: false })
      : Promise.resolve({ data: [] as Comprobante[] }),
  ]);

  const reservaRows = reservas ?? [];
  const huespedIds = compactIds(reservaRows.map((reserva) => reserva.huesped_id));
  const habitacionIds = compactIds(reservaRows.map((reserva) => reserva.habitacion_id));

  const [{ data: huespedes }, { data: habitaciones }] = await Promise.all([
    huespedIds.length > 0 ? supabase.from("huespedes").select("*").in("id", huespedIds) : Promise.resolve({ data: [] as Huesped[] }),
    habitacionIds.length > 0 ? supabase.from("habitaciones").select("*").in("id", habitacionIds) : Promise.resolve({ data: [] as Habitacion[] }),
  ]);

  const usuarioIds = compactIds((huespedes ?? []).map((huesped) => huesped.usuario_id));
  const { data: usuarios } =
    usuarioIds.length > 0
      ? await supabase.from("usuarios").select("*").in("id", usuarioIds)
      : { data: [] as Usuario[] };
  const contactsById = await userContactsById(supabase, usuarios ?? []);

  const reservasById = byId(reservas);
  const comprobantesByTransaccionId = byTransaccionId(comprobantes);
  const huespedesById = byId(huespedes);
  const usuariosById = byId(usuarios);
  const habitacionesById = byId(habitaciones);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const items: VerificationItem[] = transactionRows.map((transaccion) => {
    const reserva = transaccion.reserva_id ? reservasById.get(transaccion.reserva_id) : undefined;
    const huesped = reserva?.huesped_id ? huespedesById.get(reserva.huesped_id) : undefined;
    const usuario = huesped?.usuario_id ? usuariosById.get(huesped.usuario_id) : undefined;

    return {
      transaccion,
      reserva,
      comprobante: comprobantesByTransaccionId.get(transaccion.id),
      huesped,
      usuario,
      contacto: usuario ? contactsById.get(usuario.id) : undefined,
      habitacion: reserva?.habitacion_id ? habitacionesById.get(reserva.habitacion_id) : undefined,
    };
  });

  return (
    <section className="space-y-6">
      <RealtimePaymentVerificationRefresh />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Verificar comprobantes</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Revisa pagos enviados por clientes y confirma o rechaza la reserva desde una vista dedicada.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {total} pendiente{total === 1 ? "" : "s"}
        </Badge>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#d8d4c8] bg-white p-8 text-center dark:border-[#314237] dark:bg-[#18251d]">
          <FileCheck2 className="mx-auto h-8 w-8 text-[#c7a35a]" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-[#66736a] dark:text-[#b7c0b4]">
            No hay comprobantes pendientes de verificación.
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {items.map((item) => (
            <VerificationCard key={item.transaccion.id} item={item} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link href={pageHref(Math.max(1, page - 1))}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Anterior
            </Link>
          </Button>
          <p className="text-sm font-medium text-[#66736a] dark:text-[#b7c0b4]">
            Página {page} de {totalPages}
          </p>
          <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
            <Link href={pageHref(Math.min(totalPages, page + 1))}>
              Siguiente
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

const VerificationCard = ({ item }: { item: VerificationItem }) => {
  const { transaccion, reserva, comprobante, huesped, usuario, contacto, habitacion } = item;
  const proofUrl = transaccion.comprobante_url ?? comprobante?.pdf_url ?? "";

  return (
    <Card className="overflow-hidden rounded-lg shadow-none">
      <CardHeader className="gap-4 border-b border-[#ece4d4] dark:border-[#314237] lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{reserva?.codigo_reserva ?? "Reserva sin código"}</CardTitle>
            <Badge variant="secondary">Pago por verificar</Badge>
            {reserva ? <Badge variant="outline">{formatReservaEstado(reserva.estado)}</Badge> : null}
          </div>
          <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
            Enviado {formatDateTime(comprobante?.emitido_at ?? transaccion.created_at)}
          </p>
        </div>
        {reserva ? <ComprobanteVerificationActions reservaId={reserva.id} /> : null}
      </CardHeader>
      <CardContent className="grid gap-5 pt-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <InfoBox icon={UserRound} label="Cliente" value={contacto?.nombre ?? usuario?.nombre ?? "-"} detail={contacto?.telefono ?? contacto?.email ?? undefined} />
            <InfoBox
              icon={CalendarDays}
              label="Estadía"
              value={reserva ? `${formatDate(reserva.fecha_ingreso)} - ${formatDate(reserva.fecha_salida)}` : "-"}
              detail={reserva ? `${reserva.num_noches} noche${reserva.num_noches === 1 ? "" : "s"}` : undefined}
            />
            <InfoBox
              icon={Banknote}
              label="Monto"
              value={formatMoney(transaccion.monto, transaccion.moneda ?? "BOB")}
              detail={transaccion.referencia_externa ?? comprobante?.numero_comprobante ?? undefined}
            />
            <InfoBox
              icon={BedDouble}
              label="Habitación"
              value={habitacion ? `Habitación ${habitacion.numero}` : "-"}
              detail={habitacion?.tipo ?? undefined}
            />
            <InfoBox
              icon={FileText}
              label="Documento"
              value={huesped ? `${huesped.tipo_documento} ${displayDocumentNumber(huesped.numero_documento)}` : "-"}
              detail={huesped?.pais_origen ?? undefined}
            />
          </div>
          {proofUrl ? (
            <Button asChild variant="outline">
              <a href={proofUrl} target="_blank" rel="noreferrer">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Abrir comprobante
              </a>
            </Button>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-[#d8d4c8] bg-[#f6f1e6] dark:border-[#314237] dark:bg-[#1d2c23]">
          {proofUrl ? (
            isPdfUrl(proofUrl) ? (
              <div className="h-80">
                <object data={proofUrl} type="application/pdf" className="h-full w-full">
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm font-medium text-[#66736a] dark:text-[#b7c0b4]">
                    PDF seleccionado. Usa Abrir comprobante.
                  </div>
                </object>
              </div>
            ) : (
              <div className="relative aspect-[4/3]">
                <Image
                  src={proofUrl}
                  alt={`Comprobante de reserva ${reserva?.codigo_reserva ?? ""}`}
                  fill
                  sizes="(min-width: 1280px) 360px, 100vw"
                  className="object-contain"
                  unoptimized
                />
              </div>
            )
          ) : (
            <div className="flex h-80 items-center justify-center p-4 text-center text-sm font-medium text-[#66736a] dark:text-[#b7c0b4]">
              Sin archivo para revisar.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const InfoBox = ({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail?: string;
}) => (
  <div className="rounded-lg border border-[#ece4d4] bg-white p-3 dark:border-[#314237] dark:bg-[#18251d]">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">
      <Icon className="h-4 w-4 text-[#c7a35a]" aria-hidden="true" />
      {label}
    </div>
    <p className="mt-2 break-words text-sm font-semibold text-[#18221b] dark:text-zinc-100">{value}</p>
    {detail ? <p className="mt-1 break-words text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">{detail}</p> : null}
  </div>
);
