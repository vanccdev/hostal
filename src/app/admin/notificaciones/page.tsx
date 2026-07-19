import {
  Bell,
  CalendarCheck,
  Check,
  CreditCard,
  ExternalLink,
  Settings,
  UserRound,
} from "lucide-react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  openNotificationDetailAction,
} from "@/app/actions/notificaciones";
import { RealtimeNotificationsRefresh } from "@/components/admin/RealtimeNotificationsRefresh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { formatDateTime } from "@/lib/datetime";
import { formatNotificacionTipo } from "@/lib/notificacion-tipo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Notificacion, Reserva, Usuario } from "@/types/database";

const notificationLimit = 80;

const byId = <T extends { id: string }>(items: T[] | null | undefined) =>
  new Map((items ?? []).map((item) => [item.id, item]));

const compactIds = (ids: (string | null | undefined)[]) => Array.from(new Set(ids.filter((id): id is string => Boolean(id))));

const NotificationIcon = ({ notification }: { notification: Notificacion }) => {
  const action = notification.accion ?? notification.tipo;
  const entity = notification.entidad;

  if (action.startsWith("pago.")) {
    return <CreditCard className="h-5 w-5" aria-hidden="true" />;
  }

  if (action.startsWith("cliente.") || entity === "usuarios") {
    return <UserRound className="h-5 w-5" aria-hidden="true" />;
  }

  if (action.startsWith("reserva.") || entity === "reservas") {
    return <CalendarCheck className="h-5 w-5" aria-hidden="true" />;
  }

  if (action.startsWith("habitacion.") || entity === "habitaciones") {
    return <Settings className="h-5 w-5" aria-hidden="true" />;
  }

  return <Bell className="h-5 w-5" aria-hidden="true" />;
};

const metadataString = (notification: Notificacion, key: string) => {
  const metadata = notification.metadata;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = metadata[key];
  return typeof value === "string" ? value : null;
};

const hrefForNotification = (notification: Notificacion, reservasById: Map<string, Pick<Reserva, "id" | "codigo_reserva">>) => {
  if (notification.reserva_id) {
    const codigoReserva = metadataString(notification, "codigo_reserva") ?? reservasById.get(notification.reserva_id)?.codigo_reserva;
    return codigoReserva ? `/admin/reserva-detalle?q=${encodeURIComponent(codigoReserva)}` : "/admin/reserva-detalle";
  }

  if (notification.entidad === "usuarios" && notification.entidad_id) {
    return `/admin/usuarios?q=${notification.entidad_id}&qColumn=id`;
  }

  if (notification.entidad === "habitaciones" && notification.entidad_id) {
    return `/admin/habitaciones?q=${notification.entidad_id}&qColumn=id`;
  }

  if (notification.entidad === "transacciones") {
    return "/admin/verificar-comprobantes";
  }

  return null;
};

const actorName = (notification: Notificacion, usersById: Map<string, Usuario>) => {
  if (notification.actor_id) {
    return usersById.get(notification.actor_id)?.nombre ?? "Usuario del sistema";
  }

  if (notification.usuario_id) {
    return usersById.get(notification.usuario_id)?.nombre ?? "Cliente";
  }

  return "Sistema";
};

const actionLabel = (notification: Notificacion) =>
  notification.accion ? notification.accion.replaceAll(".", " · ") : formatNotificacionTipo(notification.tipo);

const NotificationCard = ({
  notification,
  usersById,
  reservasById,
}: {
  notification: Notificacion;
  usersById: Map<string, Usuario>;
  reservasById: Map<string, Pick<Reserva, "id" | "codigo_reserva">>;
}) => {
  const href = hrefForNotification(notification, reservasById);
  const unread = notification.leida === false;

  return (
    <article
      className={`rounded-lg border p-4 transition-colors ${
        unread
          ? "border-[#c7a35a]/55 bg-[#fffaf0] shadow-[0_8px_22px_rgba(199,163,90,0.12)] dark:border-[#e8d59a]/35 dark:bg-[#242218]"
          : "border-[#d8d4c8] bg-white dark:border-[#314237] dark:bg-[#18251d]"
      }`}
    >
      <div className="flex gap-3">
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            unread
              ? "bg-[#c7a35a] text-[#102317]"
              : "bg-[#f6f1e6] text-[#66736a] dark:bg-[#223229] dark:text-[#b7c0b4]"
          }`}
        >
          <NotificationIcon notification={notification} />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className={`text-sm text-[#18221b] dark:text-zinc-100 ${unread ? "font-bold" : "font-semibold"}`}>
                {notification.titulo ?? notification.mensaje}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#66736a] dark:text-[#b7c0b4]">{notification.mensaje}</p>
            </div>
            {unread ? (
              <Badge className="shrink-0" variant="default">
                Nueva
              </Badge>
            ) : null}
            <Badge className="shrink-0" variant="outline">
              {formatNotificacionTipo(notification.tipo)}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
            <span>{actorName(notification, usersById)}</span>
            <span aria-hidden="true">·</span>
            <span>{actionLabel(notification)}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={notification.created_at}>{formatDateTime(notification.created_at)}</time>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {href ? (
              <form action={openNotificationDetailAction}>
                <input type="hidden" name="notificationId" value={notification.id} />
                <input type="hidden" name="href" value={href} />
                <Button type="submit" variant="secondary" size="sm">
                  Ver detalle
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
            ) : null}
            {unread ? (
              <form action={markNotificationReadAction}>
                <input type="hidden" name="notificationId" value={notification.id} />
                <Button type="submit" variant="ghost" size="sm">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Marcar leída
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
};

const NotificationFeed = ({
  notifications,
  usersById,
  reservasById,
}: {
  notifications: Notificacion[];
  usersById: Map<string, Usuario>;
  reservasById: Map<string, Pick<Reserva, "id" | "codigo_reserva">>;
}) => (
  <section className="max-w-3xl space-y-3">
    <div className="grid gap-3">
      {notifications.length > 0 ? (
        notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            usersById={usersById}
            reservasById={reservasById}
          />
        ))
      ) : (
        <div className="rounded-lg border border-dashed border-[#d8d4c8] p-6 text-center text-sm font-medium text-[#66736a] dark:border-[#314237] dark:text-[#b7c0b4]">
          No hay notificaciones recientes.
        </div>
      )}
    </div>
  </section>
);

export default async function NotificacionesAdminPage() {
  await requireAdminModule("notificaciones");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("notificaciones")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(notificationLimit);
  const notifications = data ?? [];
  const userIds = compactIds([
    ...notifications.map((notification) => notification.actor_id),
    ...notifications.map((notification) => notification.usuario_id),
  ]);
  const { data: users } =
    userIds.length > 0 ? await supabase.from("usuarios").select("*").in("id", userIds) : { data: [] as Usuario[] };
  const reservaIds = compactIds(notifications.map((notification) => notification.reserva_id));
  const { data: reservas } =
    reservaIds.length > 0
      ? await supabase.from("reservas").select("id,codigo_reserva").in("id", reservaIds)
      : { data: [] as Pick<Reserva, "id" | "codigo_reserva">[] };
  const usersById = byId(users);
  const reservasById = byId(reservas);
  const unread = notifications.filter((notification) => notification.leida === false);

  return (
    <section className="space-y-6">
      <RealtimeNotificationsRefresh />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#18221b] dark:text-zinc-100">Notificaciones</h1>
          <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
            Actividad reciente del sistema: usuarios, reservas, pagos, estados y cambios operativos.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="default">{unread.length} nueva{unread.length === 1 ? "" : "s"}</Badge>
            <Badge variant="secondary">{notifications.length} total</Badge>
          </div>
        </div>
        <form action={markAllNotificationsReadAction}>
          <Button type="submit" variant="outline" disabled={unread.length === 0}>
            <Check className="h-4 w-4" aria-hidden="true" />
            Marcar todo como leído
          </Button>
        </form>
      </div>

      <NotificationFeed notifications={notifications} usersById={usersById} reservasById={reservasById} />
    </section>
  );
}
