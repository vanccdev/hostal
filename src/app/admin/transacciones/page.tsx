import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileCheck,
  Search,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { userContactsById, type UserContact } from "@/lib/auth/user-contact";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { paymentMethodLabel } from "@/lib/payment-method";
import { formatReservaEstado } from "@/lib/reserva-estado";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ilikePattern,
  orIlike,
  parseTableQuery,
  searchableColumnsByTable,
  sortableColumnsByTable,
  type TableQueryInput,
} from "@/lib/table-server";
import type { Comprobante, Huesped, Reserva, Transaccion, Usuario } from "@/types/database";

type TransactionCardItem = {
  transaccion: Transaccion;
  reserva?: Reserva;
  huesped?: Huesped;
  usuario?: Usuario;
  contacto?: UserContact;
  comprobante?: Comprobante;
};

const moneyFormatter = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const pageSizeOptions = [10, 20, 50];

const formatMoney = (value: number | null | undefined, currency = "BOB") =>
  `${moneyFormatter.format(Number(value ?? 0))} ${currency}`;

const paymentStateLabel = (state: string | null | undefined) => {
  if (state === "aprobada") return "Aprobada";
  if (state === "rechazada") return "Rechazada";
  if (state === "por_verificar") return "Por verificar";

  return state ?? "Pendiente";
};

const paymentStateVariant = (state: string | null | undefined) => {
  if (state === "aprobada") return "default";
  if (state === "rechazada") return "destructive";

  return "secondary";
};

const buildPageHref = ({
  dir,
  page,
  pageSize,
  q,
  sort,
}: {
  dir: string;
  page: number;
  pageSize: number;
  q: string;
  sort: string;
}) => {
  const params = new URLSearchParams();

  if (page > 1) params.set("page", String(page));
  if (pageSize !== pageSizeOptions[0]) params.set("pageSize", String(pageSize));
  if (q) params.set("q", q);
  if (sort !== "created_at") params.set("sort", sort);
  if (dir !== "desc") params.set("dir", dir);

  const query = params.toString();

  return query ? `/admin/transacciones?${query}` : "/admin/transacciones";
};

export default async function TransaccionesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  await requireAdminModule("transacciones");
  const supabase = createSupabaseAdminClient();
  const searchableColumns = searchableColumnsByTable.transacciones ?? [];
  const sortableColumns = sortableColumnsByTable.transacciones ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultDir: "desc",
    defaultSort: "created_at",
    searchableColumns,
    sortableColumns,
  });

  let query = supabase.from("transacciones").select("*", { count: "exact" });

  if (tableQuery.q) {
    if (tableQuery.qColumn !== "__all__") {
      query = query.ilike(tableQuery.qColumn as "referencia_externa", ilikePattern(tableQuery.q));
    } else {
      query = query.or(orIlike(searchableColumns, tableQuery.q));
    }
  }

  const { data, count } = await query
    .order(tableQuery.sort as "created_at", { ascending: tableQuery.dir === "asc" })
    .range(tableQuery.from, tableQuery.to);
  const transacciones = data ?? [];
  const total = count ?? 0;
  const reservaIds = [...new Set(transacciones.map((transaccion) => transaccion.reserva_id))];
  const transaccionIds = transacciones.map((transaccion) => transaccion.id);

  const [{ data: reservas }, { data: comprobantes }] = await Promise.all([
    reservaIds.length > 0 ? supabase.from("reservas").select("*").in("id", reservaIds) : Promise.resolve({ data: [] as Reserva[] }),
    transaccionIds.length > 0
      ? supabase.from("comprobantes").select("*").in("transaccion_id", transaccionIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Comprobante[] }),
  ]);

  const huespedIds = [...new Set((reservas ?? []).map((reserva) => reserva.huesped_id))];
  const { data: huespedes } =
    huespedIds.length > 0 ? await supabase.from("huespedes").select("*").in("id", huespedIds) : { data: [] as Huesped[] };
  const usuarioIds = [...new Set((huespedes ?? []).map((huesped) => huesped.usuario_id))];
  const { data: usuarios } =
    usuarioIds.length > 0 ? await supabase.from("usuarios").select("*").in("id", usuarioIds) : { data: [] as Usuario[] };
  const contactos = (usuarios ?? []).length > 0 ? await userContactsById(supabase, usuarios ?? []) : new Map<string, UserContact>();

  const reservasById = new Map((reservas ?? []).map((reserva) => [reserva.id, reserva]));
  const huespedesById = new Map((huespedes ?? []).map((huesped) => [huesped.id, huesped]));
  const usuariosById = new Map((usuarios ?? []).map((usuario) => [usuario.id, usuario]));
  const comprobantesByTransactionId = new Map((comprobantes ?? []).map((comprobante) => [comprobante.transaccion_id, comprobante]));
  const items: TransactionCardItem[] = transacciones.map((transaccion) => {
    const reserva = reservasById.get(transaccion.reserva_id);
    const huesped = reserva ? huespedesById.get(reserva.huesped_id) : undefined;
    const usuario = huesped ? usuariosById.get(huesped.usuario_id) : undefined;

    return {
      transaccion,
      reserva,
      huesped,
      usuario,
      contacto: usuario ? contactos.get(usuario.id) : undefined,
      comprobante: comprobantesByTransactionId.get(transaccion.id),
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / tableQuery.pageSize));
  const pageFrom = total === 0 ? 0 : tableQuery.from + 1;
  const pageTo = Math.min(tableQuery.to + 1, total);
  const approvedAmount = items
    .filter((item) => item.transaccion.estado_verificacion === "aprobada")
    .reduce((sum, item) => sum + Number(item.transaccion.monto ?? 0), 0);
  const pendingCount = items.filter((item) => item.transaccion.estado_verificacion === "por_verificar").length;
  const rejectedCount = items.filter((item) => item.transaccion.estado_verificacion === "rechazada").length;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Transacciones</h1>
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
          Vista operativa de pagos, comprobantes y reservas asociadas.
        </p>
      </div>

      <form className="flex flex-col gap-3 rounded-lg border border-[#d8d4c8] bg-white p-4 dark:border-[#314237] dark:bg-[#18251d] sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66736a]" />
          <Input
            name="q"
            defaultValue={tableQuery.q}
            placeholder="Buscar por referencia, método, estado, tipo o ID de reserva"
            className="pl-9"
          />
        </div>
        <input type="hidden" name="pageSize" value={tableQuery.pageSize} />
        <Button type="submit">Buscar</Button>
        {tableQuery.q ? (
          <Button asChild variant="outline">
            <Link href={buildPageHref({ page: 1, pageSize: tableQuery.pageSize, q: "", sort: tableQuery.sort, dir: tableQuery.dir })}>
              Limpiar
            </Link>
          </Button>
        ) : null}
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Aprobado en esta página" value={formatMoney(approvedAmount)} />
        <MetricCard label="Por verificar" value={String(pendingCount)} />
        <MetricCard label="Rechazadas" value={String(rejectedCount)} />
      </div>

      {items.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="p-6">
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">No hay transacciones para mostrar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <TransactionCard key={item.transaccion.id} item={item} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-lg border border-[#d8d4c8] bg-white p-4 text-sm dark:border-[#314237] dark:bg-[#18251d] md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="font-medium text-[#18221b] dark:text-zinc-100">
            Mostrando {pageFrom}-{pageTo} de {total} transacciones
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">Por página</span>
            {pageSizeOptions.map((option) => (
              <Button key={option} asChild variant={option === tableQuery.pageSize ? "default" : "outline"} size="sm">
                <Link href={buildPageHref({ page: 1, pageSize: option, q: tableQuery.q, sort: tableQuery.sort, dir: tableQuery.dir })}>
                  {option}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <p className="font-medium text-[#18221b] dark:text-zinc-100">
            Página {total === 0 ? 0 : tableQuery.page} de {total === 0 ? 0 : totalPages}
          </p>
          <div className="flex items-center gap-2">
            {tableQuery.page <= 1 ? (
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md" disabled>
                <span className="sr-only">Página anterior</span>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-md">
                <Link
                  href={buildPageHref({
                    page: tableQuery.page - 1,
                    pageSize: tableQuery.pageSize,
                    q: tableQuery.q,
                    sort: tableQuery.sort,
                    dir: tableQuery.dir,
                  })}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
            {total === 0 || tableQuery.page >= totalPages ? (
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md" disabled>
                <span className="sr-only">Página siguiente</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-md">
                <Link
                  href={buildPageHref({
                    page: tableQuery.page + 1,
                    pageSize: tableQuery.pageSize,
                    q: tableQuery.q,
                    sort: tableQuery.sort,
                    dir: tableQuery.dir,
                  })}
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <Card className="rounded-lg">
    <CardContent className="p-4">
      <p className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#c7a35a]">{value}</p>
    </CardContent>
  </Card>
);

const TransactionCard = ({ item }: { item: TransactionCardItem }) => {
  const { transaccion, reserva, huesped, usuario, contacto, comprobante } = item;
  const currency = transaccion.moneda ?? "BOB";
  const proofUrl = transaccion.comprobante_url ?? comprobante?.pdf_url ?? null;
  const clienteNombre = contacto?.nombre ?? usuario?.nombre ?? "Cliente sin nombre";
  const clienteContacto = [contacto?.email, contacto?.telefono].filter(Boolean).join(" · ") || "Sin contacto";

  return (
    <Card className="overflow-hidden rounded-lg">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-normal">{formatMoney(transaccion.monto, currency)}</h2>
              <Badge variant={paymentStateVariant(transaccion.estado_verificacion)}>
                {paymentStateLabel(transaccion.estado_verificacion)}
              </Badge>
              <Badge variant="outline">{transaccion.tipo}</Badge>
            </div>
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
              Reserva {reserva?.codigo_reserva ?? transaccion.reserva_id} · Creada {formatDateTime(transaccion.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {proofUrl ? (
              <Button asChild variant="outline" size="sm">
                <Link href={proofUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Comprobante
                </Link>
              </Button>
            ) : null}
            {reserva ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/reserva-detalle?q=${encodeURIComponent(reserva.codigo_reserva)}`}>Ver reserva</Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoBlock icon={UserRound} label="Cliente" value={clienteNombre} detail={clienteContacto} />
          <InfoBlock
            icon={CreditCard}
            label="Pago"
            value={paymentMethodLabel(transaccion.metodo_pago)}
            detail={transaccion.referencia_externa ?? comprobante?.numero_comprobante ?? "Sin referencia"}
          />
          <InfoBlock
            icon={CalendarDays}
            label="Estadía"
            value={reserva ? `${formatDate(reserva.fecha_ingreso)} - ${formatDate(reserva.fecha_salida)}` : "-"}
            detail={reserva ? formatReservaEstado(reserva.estado) : "Reserva no encontrada"}
          />
          <InfoBlock
            icon={FileCheck}
            label="Verificación"
            value={paymentStateLabel(transaccion.estado_verificacion)}
            detail={transaccion.verificado_at ? formatDateTime(transaccion.verificado_at) : "Sin verificación"}
          />
        </div>

        <div className="grid gap-3 text-sm lg:grid-cols-3">
          <DetailList
            title="Transacción"
            rows={[
              ["ID", transaccion.id],
              ["Monto", formatMoney(transaccion.monto, currency)],
              ["Tipo", transaccion.tipo],
              ["Notas", transaccion.notas_admin ?? "-"],
            ]}
          />
          <DetailList
            title="Reserva"
            rows={[
              ["Código", reserva?.codigo_reserva ?? "-"],
              ["Noches", reserva?.num_noches?.toString() ?? "-"],
              ["Huéspedes", reserva?.num_huespedes?.toString() ?? "-"],
              ["Total reserva", reserva ? formatMoney(reserva.precio_total, currency) : "-"],
            ]}
          />
          <DetailList
            title="Comprobante"
            rows={[
              ["Archivo", proofUrl ? "Subido" : "Pendiente"],
              ["Número", comprobante?.numero_comprobante ?? transaccion.referencia_externa ?? "-"],
              ["Emitido", comprobante?.emitido_at ? formatDateTime(comprobante.emitido_at) : "-"],
              ["Documento huésped", huesped ? `${huesped.tipo_documento} ${huesped.numero_documento}` : "-"],
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const InfoBlock = ({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <div className="rounded-lg border border-[#d8d4c8] bg-[#f8f5ec] p-3 dark:border-[#314237] dark:bg-[#142019]">
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#c7a35a]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{label}</p>
        <p className="mt-1 break-words font-semibold text-[#18221b] dark:text-zinc-100">{value}</p>
        <p className="mt-0.5 break-words text-xs text-[#66736a] dark:text-[#b7c0b4]">{detail}</p>
      </div>
    </div>
  </div>
);

const DetailList = ({ rows, title }: { rows: Array<[string, string]>; title: string }) => (
  <div className="rounded-lg border border-[#d8d4c8] p-3 dark:border-[#314237]">
    <p className="font-semibold text-[#18221b] dark:text-zinc-100">{title}</p>
    <dl className="mt-3 space-y-2">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 sm:grid-cols-[120px_1fr]">
          <dt className="text-[#66736a] dark:text-[#b7c0b4]">{label}</dt>
          <dd className="break-words font-medium text-[#18221b] dark:text-zinc-100 sm:text-right">{value}</dd>
        </div>
      ))}
    </dl>
  </div>
);
