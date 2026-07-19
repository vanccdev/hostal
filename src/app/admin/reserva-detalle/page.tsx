import { Search } from "lucide-react";
import { ReservaDetalleCard, type ReservaDetalleItem } from "@/components/admin/ReservaDetalleCard";
import { ReservaDetallePagination } from "@/components/admin/ReservaDetallePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { authUserIdsMatchingContact, userContactsById } from "@/lib/auth/user-contact";
import { getStaySettings } from "@/lib/stay-settings";
import { ilikePattern } from "@/lib/table-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AuditLog,
  Cancelacion,
  Comprobante,
  Habitacion,
  Huesped,
  ImgHabitacion,
  Notificacion,
  Tarifa,
  Transaccion,
  Usuario,
} from "@/types/database";

type ReservaDetalleSearchParams = {
  page?: string | string[];
  pageSize?: string | string[];
  q?: string | string[];
};

const pageSizeOptions = new Set([5, 10, 20]);

const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseQuery = (params: ReservaDetalleSearchParams | undefined) => {
  const requestedPageSize = positiveInteger(firstValue(params?.pageSize), 5);
  const pageSize = pageSizeOptions.has(requestedPageSize) ? requestedPageSize : 5;
  const page = positiveInteger(firstValue(params?.page), 1);
  const q = firstValue(params?.q)?.trim() ?? "";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { page, pageSize, q, from, to };
};

const compactIds = (ids: (string | null | undefined)[]) => Array.from(new Set(ids.filter((id): id is string => Boolean(id))));

const byId = <T extends { id: string }>(items: T[] | null | undefined) =>
  new Map((items ?? []).map((item) => [item.id, item]));

const groupByReservaId = <T extends { reserva_id: string | null }>(items: T[] | null | undefined) => {
  const grouped = new Map<string, T[]>();

  for (const item of items ?? []) {
    if (!item.reserva_id) {
      continue;
    }

    grouped.set(item.reserva_id, [...(grouped.get(item.reserva_id) ?? []), item]);
  }

  return grouped;
};

const groupImagesByRoom = (items: ImgHabitacion[] | null | undefined) => {
  const grouped = new Map<string, ImgHabitacion[]>();

  for (const item of items ?? []) {
    grouped.set(item.habitacion_id, [...(grouped.get(item.habitacion_id) ?? []), item]);
  }

  return grouped;
};

const groupAuditByReserva = (items: AuditLog[] | null | undefined) => {
  const grouped = new Map<string, AuditLog[]>();

  for (const item of items ?? []) {
    if (!item.registro_id) {
      continue;
    }

    grouped.set(item.registro_id, [...(grouped.get(item.registro_id) ?? []), item]);
  }

  return grouped;
};

const reservationSearchFilter = (pattern: string, huespedIds: string[]) => {
  const filters = [
    `codigo_reserva.ilike.${pattern}`,
    `estado.ilike.${pattern}`,
    `canal_origen.ilike.${pattern}`,
  ];

  if (huespedIds.length > 0) {
    filters.push(`huesped_id.in.(${huespedIds.join(",")})`);
  }

  return filters.join(",");
};

export default async function ReservaDetallePage({
  searchParams,
}: {
  searchParams: Promise<ReservaDetalleSearchParams>;
}) {
  await requireAdminModule("reservas");

  const supabase = createSupabaseAdminClient();
  const staySettings = await getStaySettings(supabase);
  const query = parseQuery(await searchParams);
  let searchHuespedIds: string[] = [];

  if (query.q) {
    const pattern = ilikePattern(query.q);
    const [{ data: matchedHuespedes }, { data: matchedUsuarios }, authMatchedUserIds] = await Promise.all([
      supabase
        .from("huespedes")
        .select("id")
        .or(`numero_documento.ilike.${pattern},pais_origen.ilike.${pattern}`)
        .limit(100),
      supabase.from("usuarios").select("id").ilike("nombre", pattern).limit(100),
      authUserIdsMatchingContact(supabase, query.q),
    ]);
    const matchedUserIds = compactIds([...(matchedUsuarios ?? []).map((usuario) => usuario.id), ...authMatchedUserIds]);
    const { data: matchedUserHuespedes } =
      matchedUserIds.length > 0
        ? await supabase.from("huespedes").select("id").in("usuario_id", matchedUserIds).limit(100)
        : { data: [] as Pick<Huesped, "id">[] };

    searchHuespedIds = compactIds([
      ...(matchedHuespedes ?? []).map((huesped) => huesped.id),
      ...(matchedUserHuespedes ?? []).map((huesped) => huesped.id),
    ]);
  }

  let reservasQuery = supabase
    .from("reservas")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(query.from, query.to);

  if (query.q) {
    const pattern = ilikePattern(query.q);
    reservasQuery = reservasQuery.or(reservationSearchFilter(pattern, searchHuespedIds));
  }

  const { data: reservas, count } = await reservasQuery;
  const reservationRows = reservas ?? [];
  const reservaIds = reservationRows.map((reserva) => reserva.id);
  const huespedIds = compactIds(reservationRows.map((reserva) => reserva.huesped_id));
  const habitacionIds = compactIds(reservationRows.map((reserva) => reserva.habitacion_id));
  const tarifaIds = compactIds(reservationRows.map((reserva) => reserva.tarifa_id));

  const [
    { data: huespedes },
    { data: habitaciones },
    { data: tarifas },
    { data: imagenes },
    { data: transacciones },
    { data: comprobantes },
    { data: cancelaciones },
    { data: notificaciones },
    { data: auditoria },
  ] = await Promise.all([
    huespedIds.length > 0 ? supabase.from("huespedes").select("*").in("id", huespedIds) : Promise.resolve({ data: [] as Huesped[] }),
    habitacionIds.length > 0 ? supabase.from("habitaciones").select("*").in("id", habitacionIds) : Promise.resolve({ data: [] as Habitacion[] }),
    tarifaIds.length > 0 ? supabase.from("tarifas").select("*").in("id", tarifaIds) : Promise.resolve({ data: [] as Tarifa[] }),
    habitacionIds.length > 0
      ? supabase.from("img_habitaciones").select("*").in("habitacion_id", habitacionIds).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as ImgHabitacion[] }),
    reservaIds.length > 0
      ? supabase.from("transacciones").select("*").in("reserva_id", reservaIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Transaccion[] }),
    reservaIds.length > 0
      ? supabase.from("comprobantes").select("*").in("reserva_id", reservaIds).order("emitido_at", { ascending: false })
      : Promise.resolve({ data: [] as Comprobante[] }),
    reservaIds.length > 0
      ? supabase.from("cancelaciones").select("*").in("reserva_id", reservaIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Cancelacion[] }),
    reservaIds.length > 0
      ? supabase.from("notificaciones").select("*").in("reserva_id", reservaIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Notificacion[] }),
    reservaIds.length > 0
      ? supabase
          .from("audit_log")
          .select("*")
          .eq("tabla_afectada", "reservas")
          .in("registro_id", reservaIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as AuditLog[] }),
  ]);

  const huespedesById = byId(huespedes);
  const habitacionesById = byId(habitaciones);
  const tarifasById = byId(tarifas);
  const imagesByRoom = groupImagesByRoom(imagenes);
  const transaccionesByReserva = groupByReservaId(transacciones);
  const comprobantesByReserva = groupByReservaId(comprobantes);
  const cancelacionesByReserva = groupByReservaId(cancelaciones);
  const notificacionesByReserva = groupByReservaId(notificaciones);
  const auditoriaByReserva = groupAuditByReserva(auditoria);

  const referencedUserIds = compactIds([
    ...reservationRows.map((reserva) => reserva.registrado_por),
    ...(huespedes ?? []).map((huesped) => huesped.usuario_id),
    ...(transacciones ?? []).map((transaccion) => transaccion.verificado_por),
    ...(cancelaciones ?? []).map((cancelacion) => cancelacion.gestionado_por),
    ...(auditoria ?? []).map((audit) => audit.usuario_id),
  ]);
  const { data: usuarios } =
    referencedUserIds.length > 0
      ? await supabase.from("usuarios").select("*").in("id", referencedUserIds)
      : { data: [] as Usuario[] };
  const usuariosById = byId(usuarios);
  const contactsById = await userContactsById(supabase, usuarios ?? []);

  const items: ReservaDetalleItem[] = reservationRows.map((reserva) => {
    const huesped = huespedesById.get(reserva.huesped_id);

    return {
      reserva,
      huesped,
      usuarioCliente: huesped?.usuario_id ? usuariosById.get(huesped.usuario_id) : undefined,
      contactoCliente: huesped?.usuario_id ? contactsById.get(huesped.usuario_id) : undefined,
      habitacion: habitacionesById.get(reserva.habitacion_id),
      habitacionImagenes: imagesByRoom.get(reserva.habitacion_id) ?? [],
      tarifa: tarifasById.get(reserva.tarifa_id),
      registradoPor: usuariosById.get(reserva.registrado_por),
      transacciones: transaccionesByReserva.get(reserva.id) ?? [],
      comprobantes: comprobantesByReserva.get(reserva.id) ?? [],
      cancelaciones: cancelacionesByReserva.get(reserva.id) ?? [],
      notificaciones: notificacionesByReserva.get(reserva.id) ?? [],
      auditoria: auditoriaByReserva.get(reserva.id) ?? [],
      usuariosById,
      staySettings,
    };
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reserva detalle</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Vista paginada por tarjetas con reserva, cliente, habitación, pagos, comprobantes y seguimiento.
          </p>
        </div>
        <form action="/admin/reserva-detalle" className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row">
          <input type="hidden" name="pageSize" value={query.pageSize} />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66736a]" aria-hidden="true" />
            <Input name="q" defaultValue={query.q} placeholder="Buscar código, estado, cliente, correo o teléfono" className="pl-9" />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </div>

      <div className="space-y-5">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d8d4c8] bg-white p-8 text-center dark:border-[#314237] dark:bg-[#18251d]">
            <p className="text-sm font-medium text-[#66736a] dark:text-[#b7c0b4]">No hay reservas para mostrar.</p>
          </div>
        ) : (
          items.map((item) => <ReservaDetalleCard key={item.reserva.id} item={item} />)
        )}
        <ReservaDetallePagination page={query.page} pageSize={query.pageSize} total={count ?? 0} q={query.q} />
      </div>
    </section>
  );
}
