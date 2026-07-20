import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { APP_LOCALE, APP_TIME_ZONE, localISODate } from "@/lib/datetime";
import { BedDouble, CalendarCheck, CircleDollarSign, Users } from "lucide-react";
import type { ReservaCanal, ReservaEstado } from "@/types/database";

const tables = ["habitaciones", "huespedes", "reservas", "usuarios"] as const;
const labels: Record<(typeof tables)[number], string> = {
  habitaciones: "Habitaciones",
  huespedes: "Huéspedes",
  reservas: "Reservas",
  usuarios: "Usuarios",
};

const reservaEstados: ReservaEstado[] = ["pendiente_pago", "confirmada", "checkin", "checkout", "cancelada", "no_show"];
const reservaCanales: ReservaCanal[] = ["web", "recepcion", "walkin", "whatsapp"];
const activeReservationStates: ReservaEstado[] = ["pendiente_pago", "confirmada", "checkin"];

const stateLabels: Record<ReservaEstado, string> = {
  pendiente_pago: "Pendiente",
  confirmada: "Confirmada",
  checkin: "Check-in",
  checkout: "Checkout",
  cancelada: "Cancelada",
  no_show: "No show",
};

const channelLabels: Record<ReservaCanal, string> = {
  web: "Web",
  recepcion: "Recepción",
  walkin: "Walk-in",
  whatsapp: "WhatsApp",
};

const moneyFormatter = new Intl.NumberFormat(APP_LOCALE, {
  currency: "BOB",
  maximumFractionDigits: 0,
  style: "currency",
});

const numberFormatter = new Intl.NumberFormat(APP_LOCALE);

type CountItem = {
  table: (typeof tables)[number];
  count: number;
};

type MonthlyPoint = {
  key: string;
  label: string;
  reservations: number;
  revenue: number;
};

type Segment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const toLocalDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: APP_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "01";

  return `${value("year")}-${value("month")}-${value("day")}`;
};

const monthKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    timeZone: APP_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "01";

  return `${value("year")}-${value("month")}`;
};

const monthLabel = (date: Date) =>
  new Intl.DateTimeFormat(APP_LOCALE, {
    month: "short",
    timeZone: APP_TIME_ZONE,
  })
    .format(date)
    .replace(".", "");

const lastMonths = (total: number) => {
  const now = new Date();

  return Array.from({ length: total }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (total - index - 1), 1);

    return {
      key: monthKey(date),
      label: monthLabel(date),
      reservations: 0,
      revenue: 0,
    };
  });
};

const formatMoney = (value: number) => moneyFormatter.format(value);

const buildMountainPath = (points: MonthlyPoint[], width: number, height: number) => {
  const maxRevenue = Math.max(...points.map((point) => point.revenue), 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const topPadding = 12;
  const bottomPadding = 24;
  const drawableHeight = height - topPadding - bottomPadding;
  const chartPoints = points.map((point, index) => {
    const x = index * step;
    const y = topPadding + drawableHeight - (point.revenue / maxRevenue) * drawableHeight;

    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linePath = `M ${chartPoints.join(" L ")}`;
  const areaPath = `${linePath} L ${width},${height - bottomPadding} L 0,${height - bottomPadding} Z`;

  return { areaPath, linePath, maxRevenue };
};

const buildPieGradient = (segments: Segment[]) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total === 0) {
    return "conic-gradient(#d8d4c8 0deg 360deg)";
  }

  let cursor = 0;
  const stops = segments.map((segment) => {
    const start = cursor;
    const sweep = (segment.value / total) * 360;
    cursor += sweep;

    return `${segment.color} ${start.toFixed(1)}deg ${cursor.toFixed(1)}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
};

const MetricCard = ({
  count,
  detail,
  icon: Icon,
  title,
}: {
  count: string;
  detail: string;
  icon: typeof BedDouble;
  title: string;
}) => (
  <Card className="overflow-hidden rounded-lg">
    <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="text-sm font-medium text-[#4b5b50] dark:text-[#c7d0c3]">{title}</CardTitle>
      <Icon className="h-5 w-5 text-[#2f6f4e]" aria-hidden="true" />
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold text-[#c7a35a]">{count}</p>
      <p className="mt-1 text-xs text-[#66736a] dark:text-[#b7c0b4]">{detail}</p>
    </CardContent>
  </Card>
);

const MountainChart = ({ points }: { points: MonthlyPoint[] }) => {
  const width = 640;
  const height = 220;
  const { areaPath, linePath, maxRevenue } = buildMountainPath(points, width, height);

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Montaña de ingresos</CardTitle>
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Reservas creadas durante los últimos 6 meses.</p>
          </div>
          <Badge variant="secondary">Máx. {formatMoney(maxRevenue)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border border-[#e4dfd2] bg-[#fbfaf6] p-3 dark:border-[#314237] dark:bg-[#111912]">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full" role="img" aria-label="Ingresos por mes">
            <defs>
              <linearGradient id="income-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2f6f4e" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#c7a35a" stopOpacity="0.08" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#income-area)" />
            <path d={linePath} fill="none" stroke="#2f6f4e" strokeLinecap="round" strokeWidth="5" />
            {points.map((point, index) => {
              const x = points.length > 1 ? (index * width) / (points.length - 1) : width / 2;
              const y = 184;

              return (
                <g key={point.key}>
                  <text x={x} y={height - 4} fill="currentColor" className="text-[18px] text-[#66736a] dark:text-[#b7c0b4]" textAnchor="middle">
                    {point.label}
                  </text>
                  <text x={x} y={y} fill="currentColor" className="text-[15px] font-semibold text-[#2f6f4e]" textAnchor="middle">
                    {point.reservations}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};

const BarChart = ({ items }: { items: Segment[] }) => {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Barras por canal</CardTitle>
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Origen de reservas registradas.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const width = `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0)}%`;

          return (
            <div key={item.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-[#66736a] dark:text-[#b7c0b4]">{numberFormatter.format(item.value)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#e8e1d1] dark:bg-[#263229]">
                <div className="h-full rounded-full" style={{ backgroundColor: item.color, width }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

const PieChart = ({ segments }: { segments: Segment[] }) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Torta por estado</CardTitle>
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Distribución histórica de reservas.</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
          <div
            aria-label="Distribución de reservas por estado"
            className="grid h-40 w-40 shrink-0 place-items-center rounded-full"
            role="img"
            style={{ background: buildPieGradient(segments) }}
          >
            <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center shadow-inner dark:bg-[#18251d]">
              <span className="text-2xl font-bold">{numberFormatter.format(total)}</span>
            </div>
          </div>
          <div className="w-full space-y-2">
            {segments.map((segment) => (
              <div key={segment.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                  {segment.label}
                </span>
                <span className="font-semibold">{numberFormatter.format(segment.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default async function AdminPage() {
  await requireAdminModule("dashboard");
  const supabase = createSupabaseAdminClient();
  const today = localISODate();
  const sixMonthsAgo = toLocalDateKey(addDays(new Date(), -185));
  const [counts, estadoCounts, canalCounts, recentReservations, occupiedReservations] = await Promise.all([
    Promise.all(
      tables.map(async (table): Promise<CountItem> => {
        const { count } = await supabase.from(table).select("*", { count: "exact", head: true });

        return { table, count: count ?? 0 };
      }),
    ),
    Promise.all(
      reservaEstados.map(async (estado) => {
        const { count } = await supabase.from("reservas").select("*", { count: "exact", head: true }).eq("estado", estado);

        return { estado, count: count ?? 0 };
      }),
    ),
    Promise.all(
      reservaCanales.map(async (canal) => {
        const { count } = await supabase.from("reservas").select("*", { count: "exact", head: true }).eq("canal_origen", canal);

        return { canal, count: count ?? 0 };
      }),
    ),
    supabase
      .from("reservas")
      .select("created_at,precio_total,estado")
      .gte("created_at", `${sixMonthsAgo}T00:00:00`)
      .order("created_at", { ascending: true }),
    supabase
      .from("reservas")
      .select("id,habitacion_id")
      .lte("fecha_ingreso", today)
      .gt("fecha_salida", today)
      .in("estado", activeReservationStates),
  ]);

  const countByTable = new Map(counts.map((item) => [item.table, item.count]));
  const totalHabitaciones = countByTable.get("habitaciones") ?? 0;
  const reservasActivas = occupiedReservations.data?.length ?? 0;
  const ocupacionActual = totalHabitaciones > 0 ? Math.round((reservasActivas / totalHabitaciones) * 100) : 0;
  const monthlyPoints = lastMonths(6);
  const monthlyIndex = new Map(monthlyPoints.map((point) => [point.key, point]));

  for (const reservation of recentReservations.data ?? []) {
    const key = monthKey(new Date(reservation.created_at));
    const point = monthlyIndex.get(key);

    if (point) {
      point.reservations += 1;
      if (reservation.estado !== "cancelada" && reservation.estado !== "no_show") {
        point.revenue += Number(reservation.precio_total ?? 0);
      }
    }
  }

  const statusSegments: Segment[] = estadoCounts.map((item, index) => ({
    color: ["#c7a35a", "#2f6f4e", "#4f88c6", "#8f7a4f", "#c6534f", "#6b7280"][index],
    key: item.estado,
    label: stateLabels[item.estado],
    value: item.count,
  }));

  const channelSegments: Segment[] = canalCounts.map((item, index) => ({
    color: ["#2f6f4e", "#c7a35a", "#4f88c6", "#c6534f"][index],
    key: item.canal,
    label: channelLabels[item.canal],
    value: item.count,
  }));

  const totalRevenue = monthlyPoints.reduce((sum, point) => sum + point.revenue, 0);
  const confirmedCount = estadoCounts.find((item) => item.estado === "confirmada")?.count ?? 0;

  const metricCards = [
    {
      count: numberFormatter.format(totalHabitaciones),
      detail: `${ocupacionActual}% ocupación hoy`,
      icon: BedDouble,
      title: labels.habitaciones,
    },
    {
      count: numberFormatter.format(countByTable.get("huespedes") ?? 0),
      detail: "Fichas documentales registradas",
      icon: Users,
      title: labels.huespedes,
    },
    {
      count: numberFormatter.format(countByTable.get("reservas") ?? 0),
      detail: `${numberFormatter.format(confirmedCount)} confirmadas`,
      icon: CalendarCheck,
      title: labels.reservas,
    },
    {
      count: formatMoney(totalRevenue),
      detail: "Ingresos no cancelados en 6 meses",
      icon: CircleDollarSign,
      title: "Ingresos",
    },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel administrativo</h1>
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Resumen operativo y estadísticas del hostal.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((item) => (
          <MetricCard key={item.title} {...item} />
        ))}
      </div>
      <div className="space-y-4">
        <MountainChart points={monthlyPoints} />
        <div className="grid gap-4 lg:grid-cols-2">
          <BarChart items={channelSegments} />
          <PieChart segments={statusSegments} />
        </div>
      </div>
    </section>
  );
}
