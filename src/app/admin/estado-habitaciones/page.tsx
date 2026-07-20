import Link from "next/link";
import { BedDouble, CalendarCheck, ChevronLeft, ChevronRight, Search, Sparkles, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EstadoHabitacionForm } from "@/components/forms/EstadoHabitacionForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { userContactsById, type UserContact } from "@/lib/auth/user-contact";
import { formatDate, formatDateTime, localISODate } from "@/lib/datetime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ilikePattern, parseTableQuery, type TableQueryInput } from "@/lib/table-server";
import type { BloqueoFecha, EstadoHabitacion, EstadoHabitacionRow, Habitacion, LogEstadoHabitacion, Reserva, Usuario } from "@/types/database";

type RoomStateItem = {
  habitacion: Habitacion;
  currentState?: EstadoHabitacionRow;
  currentReservation?: Reserva;
  currentBlock?: BloqueoFecha;
  changedBy?: UserContact;
  recentLogs: LogEstadoHabitacion[];
};

const pageSizeOptions = [10, 20, 50];

const estadoLabels: Record<EstadoHabitacion, string> = {
  bloqueada: "Bloqueada",
  disponible: "Disponible",
  limpieza: "Limpieza",
  mantenimiento: "Mantenimiento",
  ocupada: "Ocupada",
};

const estadoVariant = (estado: EstadoHabitacion) => {
  if (estado === "disponible") return "default";
  if (estado === "limpieza" || estado === "mantenimiento") return "secondary";
  if (estado === "ocupada" || estado === "bloqueada") return "destructive";

  return "outline";
};

const buildPageHref = ({ page, pageSize, q }: { page: number; pageSize: number; q: string }) => {
  const params = new URLSearchParams();

  if (page > 1) params.set("page", String(page));
  if (pageSize !== pageSizeOptions[0]) params.set("pageSize", String(pageSize));
  if (q) params.set("q", q);

  const query = params.toString();

  return query ? `/admin/estado-habitaciones?${query}` : "/admin/estado-habitaciones";
};

const effectiveStatus = (item: RoomStateItem): { estado: EstadoHabitacion; detail: string; source: "reserva" | "bloqueo" | "operativo" } => {
  if (item.currentReservation) {
    return {
      estado: "ocupada",
      detail: `Reserva ${item.currentReservation.codigo_reserva} hasta ${formatDate(item.currentReservation.fecha_salida)}`,
      source: "reserva",
    };
  }

  if (item.currentBlock) {
    return {
      estado: "bloqueada",
      detail: `Bloqueada hasta ${formatDate(item.currentBlock.fecha_fin)}`,
      source: "bloqueo",
    };
  }

  return {
    estado: item.currentState?.estado ?? "disponible",
    detail: item.currentState?.notas ?? "Sin observaciones",
    source: "operativo",
  };
};

export default async function EstadoHabitacionesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  await requireAdminModule("estado-habitaciones");
  const supabase = createSupabaseAdminClient();
  const tableQuery = parseTableQuery(await searchParams, {
    defaultDir: "asc",
    defaultSort: "numero",
    searchableColumns: ["numero", "tipo", "descripcion"],
    sortableColumns: ["numero", "tipo", "piso", "capacidad_max", "created_at"],
  });

  let roomsQuery = supabase.from("habitaciones").select("*", { count: "exact" });

  if (tableQuery.q) {
    const pattern = ilikePattern(tableQuery.q);
    roomsQuery = roomsQuery.or(`numero.ilike.${pattern},tipo.ilike.${pattern},descripcion.ilike.${pattern}`);
  }

  const { data: habitaciones, count } = await roomsQuery
    .order(tableQuery.sort as "numero", { ascending: tableQuery.dir === "asc" })
    .range(tableQuery.from, tableQuery.to);
  const rooms = habitaciones ?? [];
  const roomIds = rooms.map((room) => room.id);
  const today = localISODate();

  const [{ data: states }, { data: reservations }, { data: blocks }, { data: logs }] = await Promise.all([
    roomIds.length > 0
      ? supabase.from("estado_habitaciones").select("*").in("habitacion_id", roomIds).order("changed_at", { ascending: false })
      : Promise.resolve({ data: [] as EstadoHabitacionRow[] }),
    roomIds.length > 0
      ? supabase
          .from("reservas")
          .select("*")
          .in("habitacion_id", roomIds)
          .in("estado", ["pendiente_pago", "confirmada", "checkin"])
          .lte("fecha_ingreso", today)
          .gt("fecha_salida", today)
      : Promise.resolve({ data: [] as Reserva[] }),
    roomIds.length > 0
      ? supabase
          .from("bloqueos_fechas")
          .select("*")
          .or(`habitacion_id.in.(${roomIds.join(",")}),habitacion_id.is.null`)
          .lte("fecha_inicio", today)
          .gt("fecha_fin", today)
      : Promise.resolve({ data: [] as BloqueoFecha[] }),
    roomIds.length > 0
      ? supabase.from("log_estados_habitacion").select("*").in("habitacion_id", roomIds).order("created_at", { ascending: false }).limit(80)
      : Promise.resolve({ data: [] as LogEstadoHabitacion[] }),
  ]);

  const statesByRoom = new Map<string, EstadoHabitacionRow>();
  for (const state of states ?? []) {
    if (!statesByRoom.has(state.habitacion_id)) {
      statesByRoom.set(state.habitacion_id, state);
    }
  }

  const reservationsByRoom = new Map((reservations ?? []).map((reservation) => [reservation.habitacion_id, reservation]));
  const globalBlock = (blocks ?? []).find((block) => block.habitacion_id === null);
  const blocksByRoom = new Map((blocks ?? []).filter((block) => block.habitacion_id).map((block) => [block.habitacion_id as string, block]));
  const logsByRoom = new Map<string, LogEstadoHabitacion[]>();
  for (const log of logs ?? []) {
    const current = logsByRoom.get(log.habitacion_id) ?? [];
    if (current.length < 3) {
      current.push(log);
      logsByRoom.set(log.habitacion_id, current);
    }
  }

  const userIds = [
    ...new Set([
      ...(states ?? []).map((state) => state.cambiado_por),
      ...(logs ?? []).map((log) => log.cambiado_por),
    ]),
  ];
  const { data: usuarios } = userIds.length > 0 ? await supabase.from("usuarios").select("*").in("id", userIds) : { data: [] as Usuario[] };
  const contacts = (usuarios ?? []).length > 0 ? await userContactsById(supabase, usuarios ?? []) : new Map<string, UserContact>();
  const items: RoomStateItem[] = rooms.map((habitacion) => {
    const currentState = statesByRoom.get(habitacion.id);

    return {
      habitacion,
      currentState,
      currentReservation: reservationsByRoom.get(habitacion.id),
      currentBlock: blocksByRoom.get(habitacion.id) ?? globalBlock,
      changedBy: currentState ? contacts.get(currentState.cambiado_por) : undefined,
      recentLogs: logsByRoom.get(habitacion.id) ?? [],
    };
  });

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / tableQuery.pageSize));
  const pageFrom = total === 0 ? 0 : tableQuery.from + 1;
  const pageTo = Math.min(tableQuery.to + 1, total);
  const counts = items.reduce(
    (acc, item) => {
      acc[effectiveStatus(item).estado] += 1;
      return acc;
    },
    { disponible: 0, limpieza: 0, mantenimiento: 0, ocupada: 0, bloqueada: 0 } satisfies Record<EstadoHabitacion, number>,
  );

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Estado de habitaciones</h1>
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
          Tablero para recepción y limpieza: disponibilidad operativa, limpieza, mantenimiento y ocupación real.
        </p>
      </div>

      <form className="flex flex-col gap-3 rounded-lg border border-[#d8d4c8] bg-white p-4 dark:border-[#314237] dark:bg-[#18251d] sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66736a]" />
          <Input name="q" defaultValue={tableQuery.q} placeholder="Buscar habitación, tipo o descripción" className="pl-9" />
        </div>
        <input type="hidden" name="pageSize" value={tableQuery.pageSize} />
        <Button type="submit">Buscar</Button>
        {tableQuery.q ? (
          <Button asChild variant="outline">
            <Link href={buildPageHref({ page: 1, pageSize: tableQuery.pageSize, q: "" })}>Limpiar</Link>
          </Button>
        ) : null}
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Disponibles" value={String(counts.disponible)} />
        <MetricCard label="Ocupadas" value={String(counts.ocupada)} />
        <MetricCard label="Limpieza" value={String(counts.limpieza)} />
        <MetricCard label="Mantenimiento" value={String(counts.mantenimiento)} />
        <MetricCard label="Bloqueadas" value={String(counts.bloqueada)} />
      </div>

      {items.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="p-6">
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">No hay habitaciones para mostrar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <RoomStateCard key={item.habitacion.id} item={item} contacts={contacts} />
          ))}
        </div>
      )}

      <Pagination
        page={tableQuery.page}
        pageFrom={pageFrom}
        pageSize={tableQuery.pageSize}
        pageTo={pageTo}
        q={tableQuery.q}
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

const RoomStateCard = ({ contacts, item }: { contacts: Map<string, UserContact>; item: RoomStateItem }) => {
  const status = effectiveStatus(item);
  const initialEstado = item.currentState?.estado ?? "disponible";

  return (
    <Card className="rounded-lg">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-normal">Habitación {item.habitacion.numero}</h2>
              <Badge variant={estadoVariant(status.estado)}>{estadoLabels[status.estado]}</Badge>
              <Badge variant="outline">{status.source === "operativo" ? "Operativo" : status.source === "reserva" ? "Reserva" : "Bloqueo"}</Badge>
            </div>
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
              {item.habitacion.tipo} · Piso {item.habitacion.piso} · Capacidad {item.habitacion.capacidad_max}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/habitaciones">Ver habitaciones</Link>
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoBlock icon={BedDouble} label="Estado visible" value={estadoLabels[status.estado]} detail={status.detail} />
          <InfoBlock icon={Sparkles} label="Estado interno" value={estadoLabels[initialEstado]} detail={item.currentState?.notas ?? "Sin notas"} />
          <InfoBlock icon={UserRound} label="Último cambio" value={item.changedBy?.nombre ?? "Sin registro"} detail={item.currentState ? formatDateTime(item.currentState.changed_at) : "Todavía no actualizado"} />
          <InfoBlock icon={CalendarCheck} label="Reserva/Bloqueo" value={item.currentReservation?.codigo_reserva ?? (item.currentBlock ? "Bloqueada" : "Sin cruce")} detail={item.currentBlock?.motivo ?? "Sin bloqueo activo"} />
        </div>

        <EstadoHabitacionForm
          habitacionId={item.habitacion.id}
          initialEstado={initialEstado}
          initialNotas={item.currentState?.notas}
        />

        <div className="rounded-lg border border-[#d8d4c8] p-3 text-sm dark:border-[#314237]">
          <p className="font-semibold text-[#18221b] dark:text-zinc-100">Historial reciente</p>
          {item.recentLogs.length === 0 ? (
            <p className="mt-2 text-[#66736a] dark:text-[#b7c0b4]">Sin cambios registrados.</p>
          ) : (
            <div className="mt-3 grid gap-2">
              {item.recentLogs.map((log) => (
                <div key={log.id} className="flex flex-col gap-1 rounded-lg bg-[#f8f5ec] p-2 dark:bg-[#142019] sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    {log.estado_anterior ? estadoLabels[log.estado_anterior] : "Sin estado"} →{" "}
                    {log.estado_nuevo ? estadoLabels[log.estado_nuevo] : "Sin estado"}
                  </span>
                  <span className="text-xs text-[#66736a] dark:text-[#b7c0b4]">
                    {contacts.get(log.cambiado_por)?.nombre ?? log.cambiado_por} · {formatDateTime(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
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

const Pagination = ({
  page,
  pageFrom,
  pageSize,
  pageTo,
  q,
  total,
  totalPages,
}: {
  page: number;
  pageFrom: number;
  pageSize: number;
  pageTo: number;
  q: string;
  total: number;
  totalPages: number;
}) => (
  <div className="flex flex-col gap-4 rounded-lg border border-[#d8d4c8] bg-white p-4 text-sm dark:border-[#314237] dark:bg-[#18251d] md:flex-row md:items-center md:justify-between">
    <div className="space-y-2">
      <p className="font-medium text-[#18221b] dark:text-zinc-100">
        Mostrando {pageFrom}-{pageTo} de {total} habitaciones
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">Por página</span>
        {pageSizeOptions.map((option) => (
          <Button key={option} asChild variant={option === pageSize ? "default" : "outline"} size="sm">
            <Link href={buildPageHref({ page: 1, pageSize: option, q })}>{option}</Link>
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
            <Link href={buildPageHref({ page: page - 1, pageSize, q })} aria-label="Página anterior">
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
            <Link href={buildPageHref({ page: page + 1, pageSize, q })} aria-label="Página siguiente">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  </div>
);
