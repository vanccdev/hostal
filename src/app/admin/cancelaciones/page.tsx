import Link from "next/link";
import { CalendarClock, ChevronLeft, ChevronRight, CircleDollarSign, ReceiptText, Search, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { userContactsById, type UserContact } from "@/lib/auth/user-contact";
import { formatDate, formatDateTime } from "@/lib/datetime";
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
import type { Cancelacion, Huesped, PoliticaCancelacion, Reserva, Usuario } from "@/types/database";

type CancellationCardItem = {
  cancelacion: Cancelacion;
  reserva?: Reserva;
  huesped?: Huesped;
  usuario?: Usuario;
  contacto?: UserContact;
  gestor?: UserContact;
};

const moneyFormatter = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const pageSizeOptions = [10, 20, 50];

const policyLabels: Record<PoliticaCancelacion, string> = {
  reembolso_50: "Reembolso 50%",
  reembolso_parcial: "Reembolso parcial",
  reembolso_total: "Reembolso total",
  sin_reembolso: "Sin reembolso",
};

const formatMoney = (value: number | null | undefined, currency = "BOB") =>
  `${moneyFormatter.format(Number(value ?? 0))} ${currency}`;

const policyVariant = (policy: PoliticaCancelacion) => {
  if (policy === "reembolso_total") return "default";
  if (policy === "sin_reembolso") return "destructive";

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

  return query ? `/admin/cancelaciones?${query}` : "/admin/cancelaciones";
};

export default async function CancelacionesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  await requireAdminModule("cancelaciones");
  const supabase = createSupabaseAdminClient();
  const searchableColumns = searchableColumnsByTable.cancelaciones ?? [];
  const sortableColumns = sortableColumnsByTable.cancelaciones ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultDir: "desc",
    defaultSort: "created_at",
    searchableColumns,
    sortableColumns,
  });

  let query = supabase.from("cancelaciones").select("*", { count: "exact" });

  if (tableQuery.q) {
    if (tableQuery.qColumn !== "__all__") {
      query = query.ilike(tableQuery.qColumn as "motivo", ilikePattern(tableQuery.q));
    } else {
      query = query.or(orIlike(searchableColumns, tableQuery.q));
    }
  }

  const { data, count } = await query
    .order(tableQuery.sort as "created_at", { ascending: tableQuery.dir === "asc" })
    .range(tableQuery.from, tableQuery.to);
  const cancelaciones = data ?? [];
  const total = count ?? 0;
  const reservaIds = [...new Set(cancelaciones.map((cancelacion) => cancelacion.reserva_id))];

  const { data: reservas } =
    reservaIds.length > 0 ? await supabase.from("reservas").select("*").in("id", reservaIds) : { data: [] as Reserva[] };
  const huespedIds = [...new Set((reservas ?? []).map((reserva) => reserva.huesped_id))];
  const { data: huespedes } =
    huespedIds.length > 0 ? await supabase.from("huespedes").select("*").in("id", huespedIds) : { data: [] as Huesped[] };
  const usuarioIds = [
    ...new Set([
      ...(huespedes ?? []).map((huesped) => huesped.usuario_id),
      ...cancelaciones.map((cancelacion) => cancelacion.gestionado_por),
    ]),
  ];
  const { data: usuarios } =
    usuarioIds.length > 0 ? await supabase.from("usuarios").select("*").in("id", usuarioIds) : { data: [] as Usuario[] };
  const contactos = (usuarios ?? []).length > 0 ? await userContactsById(supabase, usuarios ?? []) : new Map<string, UserContact>();

  const reservasById = new Map((reservas ?? []).map((reserva) => [reserva.id, reserva]));
  const huespedesById = new Map((huespedes ?? []).map((huesped) => [huesped.id, huesped]));
  const usuariosById = new Map((usuarios ?? []).map((usuario) => [usuario.id, usuario]));
  const items: CancellationCardItem[] = cancelaciones.map((cancelacion) => {
    const reserva = reservasById.get(cancelacion.reserva_id);
    const huesped = reserva ? huespedesById.get(reserva.huesped_id) : undefined;
    const usuario = huesped ? usuariosById.get(huesped.usuario_id) : undefined;

    return {
      cancelacion,
      reserva,
      huesped,
      usuario,
      contacto: usuario ? contactos.get(usuario.id) : undefined,
      gestor: contactos.get(cancelacion.gestionado_por),
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / tableQuery.pageSize));
  const pageFrom = total === 0 ? 0 : tableQuery.from + 1;
  const pageTo = Math.min(tableQuery.to + 1, total);
  const retainedAmount = items.reduce((sum, item) => sum + Number(item.cancelacion.monto_retenido ?? 0), 0);
  const refundAmount = items.reduce((sum, item) => sum + Number(item.cancelacion.monto_reembolso ?? 0), 0);
  const partialCount = items.filter((item) => item.cancelacion.politica_aplicada === "reembolso_parcial").length;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Cancelaciones</h1>
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
          Registro contable y operativo de reservas canceladas.
        </p>
      </div>

      <form className="flex flex-col gap-3 rounded-lg border border-[#d8d4c8] bg-white p-4 dark:border-[#314237] dark:bg-[#18251d] sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66736a]" />
          <Input
            name="q"
            defaultValue={tableQuery.q}
            placeholder="Buscar por motivo, política, reserva o gestor"
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
        <MetricCard label="Retenido en esta página" value={formatMoney(retainedAmount)} />
        <MetricCard label="No retenido/reembolso" value={formatMoney(refundAmount)} />
        <MetricCard label="Reembolso parcial" value={String(partialCount)} />
      </div>

      {items.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="p-6">
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">No hay cancelaciones para mostrar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <CancellationCard key={item.cancelacion.id} item={item} />
          ))}
        </div>
      )}

      <Pagination
        dir={tableQuery.dir}
        page={tableQuery.page}
        pageFrom={pageFrom}
        pageSize={tableQuery.pageSize}
        pageTo={pageTo}
        q={tableQuery.q}
        sort={tableQuery.sort}
        total={total}
        totalPages={totalPages}
      />
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

const CancellationCard = ({ item }: { item: CancellationCardItem }) => {
  const { cancelacion, contacto, gestor, huesped, reserva } = item;
  const currency = "BOB";
  const clienteNombre = contacto?.nombre ?? "Cliente sin nombre";
  const clienteContacto = [contacto?.email, contacto?.telefono].filter(Boolean).join(" · ") || "Sin contacto";

  return (
    <Card className="overflow-hidden rounded-lg">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-normal">
                {reserva?.codigo_reserva ? `Reserva ${reserva.codigo_reserva}` : "Cancelación de reserva"}
              </h2>
              <Badge variant={policyVariant(cancelacion.politica_aplicada)}>{policyLabels[cancelacion.politica_aplicada]}</Badge>
              <Badge variant="outline">{cancelacion.horas_anticipacion} h antes</Badge>
            </div>
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
              Cancelada {formatDateTime(cancelacion.created_at)} · Gestionó {gestor?.nombre ?? cancelacion.gestionado_por}
            </p>
          </div>

          {reserva ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/reserva-detalle?q=${encodeURIComponent(reserva.codigo_reserva)}`}>Ver reserva</Link>
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoBlock icon={UserRound} label="Cliente" value={clienteNombre} detail={clienteContacto} />
          <InfoBlock
            icon={CircleDollarSign}
            label="Pagado aprobado"
            value={formatMoney(cancelacion.monto_pagado_aprobado, currency)}
            detail={`${cancelacion.retencion_porcentaje_aplicado}% retención aplicada`}
          />
          <InfoBlock
            icon={ReceiptText}
            label="Retenido"
            value={formatMoney(cancelacion.monto_retenido, currency)}
            detail={`No retenido ${formatMoney(cancelacion.monto_reembolso, currency)}`}
          />
          <InfoBlock
            icon={CalendarClock}
            label="Estadía"
            value={reserva ? `${formatDate(reserva.fecha_ingreso)} - ${formatDate(reserva.fecha_salida)}` : "-"}
            detail={reserva ? formatReservaEstado(reserva.estado) : "Reserva no encontrada"}
          />
        </div>

        <div className="grid gap-3 text-sm lg:grid-cols-3">
          <DetailList
            title="Motivo"
            rows={[
              ["Detalle", cancelacion.motivo],
              ["Política", policyLabels[cancelacion.politica_aplicada]],
              ["Anticipación", `${cancelacion.horas_anticipacion} horas`],
              ["Gestor", gestor?.nombre ?? cancelacion.gestionado_por],
            ]}
          />
          <DetailList
            title="Contabilidad"
            rows={[
              ["Pagado", formatMoney(cancelacion.monto_pagado_aprobado, currency)],
              ["Retenido", formatMoney(cancelacion.monto_retenido, currency)],
              ["No retenido", formatMoney(cancelacion.monto_reembolso, currency)],
              ["% aplicado", `${cancelacion.retencion_porcentaje_aplicado}%`],
            ]}
          />
          <DetailList
            title="Reserva"
            rows={[
              ["Código", reserva?.codigo_reserva ?? "-"],
              ["Total original", reserva ? formatMoney(reserva.precio_total, currency) : "-"],
              ["Total ajustado", reserva ? formatMoney(reserva.precio_ajustado ?? reserva.precio_total, currency) : "-"],
              ["Documento", huesped ? `${huesped.tipo_documento} ${huesped.numero_documento}` : "-"],
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

const Pagination = ({
  dir,
  page,
  pageFrom,
  pageSize,
  pageTo,
  q,
  sort,
  total,
  totalPages,
}: {
  dir: string;
  page: number;
  pageFrom: number;
  pageSize: number;
  pageTo: number;
  q: string;
  sort: string;
  total: number;
  totalPages: number;
}) => (
  <div className="flex flex-col gap-4 rounded-lg border border-[#d8d4c8] bg-white p-4 text-sm dark:border-[#314237] dark:bg-[#18251d] md:flex-row md:items-center md:justify-between">
    <div className="space-y-2">
      <p className="font-medium text-[#18221b] dark:text-zinc-100">
        Mostrando {pageFrom}-{pageTo} de {total} cancelaciones
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">Por página</span>
        {pageSizeOptions.map((option) => (
          <Button key={option} asChild variant={option === pageSize ? "default" : "outline"} size="sm">
            <Link href={buildPageHref({ page: 1, pageSize: option, q, sort, dir })}>{option}</Link>
          </Button>
        ))}
      </div>
    </div>

    <div className="flex items-center justify-between gap-3 md:justify-end">
      <p className="font-medium text-[#18221b] dark:text-zinc-100">
        Página {total === 0 ? 0 : page} de {total === 0 ? 0 : totalPages}
      </p>
      <div className="flex items-center gap-2">
        {page <= 1 ? (
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md" disabled>
            <span className="sr-only">Página anterior</span>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-md">
            <Link href={buildPageHref({ page: page - 1, pageSize, q, sort, dir })} aria-label="Página anterior">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
        {total === 0 || page >= totalPages ? (
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md" disabled>
            <span className="sr-only">Página siguiente</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-md">
            <Link href={buildPageHref({ page: page + 1, pageSize, q, sort, dir })} aria-label="Página siguiente">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  </div>
);
