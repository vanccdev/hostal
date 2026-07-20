import Link from "next/link";
import { BedDouble, CalendarX2, ChevronLeft, ChevronRight, Clock, Search, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DeleteBloqueoButton } from "@/components/admin/DeleteBloqueoButton";
import { BloqueoForm } from "@/components/forms/BloqueoForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { userContactsById, type UserContact } from "@/lib/auth/user-contact";
import { formatDate, formatDateTime, localISODate } from "@/lib/datetime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ilikePattern,
  orIlike,
  parseTableQuery,
  searchableColumnsByTable,
  sortableColumnsByTable,
  type TableQueryInput,
} from "@/lib/table-server";
import type { BloqueoFecha, Habitacion, Usuario } from "@/types/database";

type BlockCardItem = {
  bloqueo: BloqueoFecha;
  habitacion?: Habitacion;
  creador?: UserContact;
};

const pageSizeOptions = [10, 20, 50];

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
  if (sort !== "fecha_inicio") params.set("sort", sort);
  if (dir !== "desc") params.set("dir", dir);

  const query = params.toString();

  return query ? `/admin/bloqueos?${query}` : "/admin/bloqueos";
};

const dateOnlyMs = (value: string) => new Date(`${value}T00:00:00-04:00`).getTime();

const blockedDays = (bloqueo: BloqueoFecha) => {
  const start = dateOnlyMs(bloqueo.fecha_inicio);
  const end = dateOnlyMs(bloqueo.fecha_fin);
  const days = Math.ceil((end - start) / 86_400_000);

  return Math.max(1, days);
};

const blockStatus = (bloqueo: BloqueoFecha) => {
  const today = localISODate();

  if (bloqueo.fecha_fin <= today) return { label: "Finalizado", variant: "outline" as const };
  if (bloqueo.fecha_inicio <= today && bloqueo.fecha_fin > today) return { label: "Activo", variant: "destructive" as const };

  return { label: "Programado", variant: "secondary" as const };
};

export default async function BloqueosPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  await requireAdminModule("bloqueos");
  const supabase = createSupabaseAdminClient();
  const searchableColumns = searchableColumnsByTable.bloqueos_fechas ?? [];
  const sortableColumns = sortableColumnsByTable.bloqueos_fechas ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultDir: "desc",
    defaultSort: "fecha_inicio",
    searchableColumns,
    sortableColumns,
  });

  let query = supabase.from("bloqueos_fechas").select("*", { count: "exact" });

  if (tableQuery.q) {
    if (tableQuery.qColumn !== "__all__") {
      query = query.ilike(tableQuery.qColumn as "motivo", ilikePattern(tableQuery.q));
    } else {
      query = query.or(orIlike(searchableColumns, tableQuery.q));
    }
  }

  const { data, count } = await query
    .order(tableQuery.sort as "fecha_inicio", { ascending: tableQuery.dir === "asc" })
    .range(tableQuery.from, tableQuery.to);
  const bloqueos = data ?? [];
  const total = count ?? 0;
  const habitacionIds = [...new Set(bloqueos.map((bloqueo) => bloqueo.habitacion_id).filter((id): id is string => Boolean(id)))];
  const creadorIds = [...new Set(bloqueos.map((bloqueo) => bloqueo.creado_por))];
  const today = localISODate();

  const [{ data: allHabitaciones }, { data: activeBlocks }, { data: blockedHabitaciones }, { data: usuarios }] = await Promise.all([
    supabase
      .from("habitaciones")
      .select("id,numero,tipo,piso,capacidad_max,descripcion,activa,created_at,tarifa_id")
      .order("numero", { ascending: true }),
    supabase.from("bloqueos_fechas").select("habitacion_id").gt("fecha_fin", today),
    habitacionIds.length > 0
      ? supabase.from("habitaciones").select("id,numero,tipo,piso,capacidad_max,descripcion,activa,created_at,tarifa_id").in("id", habitacionIds)
      : Promise.resolve({ data: [] as Habitacion[] }),
    creadorIds.length > 0 ? supabase.from("usuarios").select("*").in("id", creadorIds) : Promise.resolve({ data: [] as Usuario[] }),
  ]);
  const contactos = (usuarios ?? []).length > 0 ? await userContactsById(supabase, usuarios ?? []) : new Map<string, UserContact>();
  const habitacionesById = new Map((blockedHabitaciones ?? []).map((habitacion) => [habitacion.id, habitacion]));
  const items: BlockCardItem[] = bloqueos.map((bloqueo) => ({
    bloqueo,
    habitacion: bloqueo.habitacion_id ? habitacionesById.get(bloqueo.habitacion_id) : undefined,
    creador: contactos.get(bloqueo.creado_por),
  }));

  const totalPages = Math.max(1, Math.ceil(total / tableQuery.pageSize));
  const pageFrom = total === 0 ? 0 : tableQuery.from + 1;
  const pageTo = Math.min(tableQuery.to + 1, total);
  const activeCount = items.filter((item) => blockStatus(item.bloqueo).label === "Activo").length;
  const scheduledCount = items.filter((item) => blockStatus(item.bloqueo).label === "Programado").length;
  const totalBlockedDays = items.reduce((sum, item) => sum + blockedDays(item.bloqueo), 0);
  const hasActiveGlobalBlock = (activeBlocks ?? []).some((bloqueo) => bloqueo.habitacion_id === null);
  const activeBlockedRoomIds = hasActiveGlobalBlock
    ? (allHabitaciones ?? []).map((habitacion) => habitacion.id)
    : [
        ...new Set(
          (activeBlocks ?? [])
            .map((bloqueo) => bloqueo.habitacion_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Bloqueos de fechas</h1>
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
          Fechas no reservables por mantenimiento, operación o cierre temporal.
        </p>
      </div>

      <form className="flex flex-col gap-3 rounded-lg border border-[#d8d4c8] bg-white p-4 dark:border-[#314237] dark:bg-[#18251d] sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66736a]" />
          <Input
            name="q"
            defaultValue={tableQuery.q}
            placeholder="Buscar por motivo, habitación, usuario o ID"
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

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Crear bloqueo</CardTitle>
        </CardHeader>
        <CardContent>
          <BloqueoForm blockedRoomIds={activeBlockedRoomIds} habitaciones={allHabitaciones ?? []} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Activos" value={String(activeCount)} />
        <MetricCard label="Programados" value={String(scheduledCount)} />
        <MetricCard label="Días bloqueados" value={String(totalBlockedDays)} />
      </div>

      {items.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="p-6">
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">No hay bloqueos para mostrar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <BlockCard key={item.bloqueo.id} item={item} />
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

const BlockCard = ({ item }: { item: BlockCardItem }) => {
  const { bloqueo, creador, habitacion } = item;
  const status = blockStatus(bloqueo);
  const roomTitle = habitacion ? `Habitación ${habitacion.numero}` : "Bloqueo general";
  const roomDetail = habitacion ? `${habitacion.tipo} · Piso ${habitacion.piso} · Capacidad ${habitacion.capacidad_max}` : "Aplica al calendario general";

  return (
    <Card className="overflow-hidden rounded-lg">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-normal">{roomTitle}</h2>
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant="outline">{blockedDays(bloqueo)} días</Badge>
            </div>
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
              {formatDate(bloqueo.fecha_inicio)} - {formatDate(bloqueo.fecha_fin)} · Creado {formatDateTime(bloqueo.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {habitacion ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/habitaciones">Ver habitaciones</Link>
              </Button>
            ) : null}
            <DeleteBloqueoButton bloqueoId={bloqueo.id} isGlobal={!bloqueo.habitacion_id} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoBlock icon={BedDouble} label="Alcance" value={roomTitle} detail={roomDetail} />
          <InfoBlock icon={CalendarX2} label="Rango" value={`${formatDate(bloqueo.fecha_inicio)} - ${formatDate(bloqueo.fecha_fin)}`} detail="No reservable" />
          <InfoBlock icon={Clock} label="Duración" value={`${blockedDays(bloqueo)} días`} detail={status.label} />
          <InfoBlock icon={UserRound} label="Responsable" value={creador?.nombre ?? bloqueo.creado_por} detail={creador?.email ?? "Sin email"} />
        </div>

        <div className="grid gap-3 text-sm lg:grid-cols-2">
          <DetailList
            title="Motivo"
            rows={[
              ["Detalle", bloqueo.motivo],
              ["Estado", status.label],
              ["Inicio", formatDate(bloqueo.fecha_inicio)],
              ["Fin", formatDate(bloqueo.fecha_fin)],
            ]}
          />
          <DetailList
            title="Registro"
            rows={[
              ["ID", bloqueo.id],
              ["Habitación", habitacion?.numero ?? "General"],
              ["Creado por", creador?.nombre ?? bloqueo.creado_por],
              ["Creado", formatDateTime(bloqueo.created_at)],
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
        Mostrando {pageFrom}-{pageTo} de {total} bloqueos
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
