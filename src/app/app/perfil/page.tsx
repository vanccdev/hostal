import Link from "next/link";
import { BadgeCheck, CalendarDays, CreditCard, FileCheck2, IdCard, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { ProfileEditForm } from "@/components/app/ProfileEditForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { displayDocumentNumber, isPendingDocumentNumber } from "@/lib/client-profile";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { getGuestForUser } from "@/lib/db/current-guest";
import { formatReservaEstado } from "@/lib/reserva-estado";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const statCardClass = "rounded-lg border border-[#ece4d4] bg-[#fbfaf5] p-4 dark:border-[#314237] dark:bg-[#142019]";

const statusVariant = (value: string | null | undefined) => {
  if (value === "pendiente_pago") {
    return "secondary";
  }

  if (value === "cancelada" || value === "no_show") {
    return "destructive";
  }

  return "default";
};

export default async function PerfilPage() {
  const currentUser = await requirePasswordReady();
  const guest = await getGuestForUser(currentUser.authUserId);
  const supabase = createSupabaseAdminClient();
  const isDocumentReady = Boolean(guest?.numero_documento && !isPendingDocumentNumber(guest.numero_documento));

  const [{ data: reservations }, { data: notifications }] = await Promise.all([
    guest
      ? supabase
          .from("reservas")
          .select("id,codigo_reserva,fecha_ingreso,fecha_salida,estado,precio_total,created_at")
          .eq("huesped_id", guest.id)
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    supabase
      .from("notificaciones")
      .select("id,tipo,mensaje,leida,created_at")
      .eq("usuario_id", currentUser.authUserId)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const reservationRows = reservations ?? [];
  const reservationIds = reservationRows.map((reservation) => reservation.id);
  const [{ data: transactions }, { data: proofs }] =
    reservationIds.length > 0
      ? await Promise.all([
          supabase.from("transacciones").select("id,reserva_id,estado_verificacion,monto,created_at").in("reserva_id", reservationIds),
          supabase.from("comprobantes").select("id,reserva_id,created_at").in("reserva_id", reservationIds),
        ])
      : [{ data: [] }, { data: [] }];

  const pendingReservations = reservationRows.filter((reservation) => reservation.estado === "pendiente_pago").length;
  const approvedPayments = (transactions ?? []).filter((transaction) => transaction.estado_verificacion === "aprobada").length;
  const profileCompletion = [currentUser.profile?.nombre, currentUser.email, currentUser.phone, isDocumentReady, guest?.fecha_nacimiento].filter(Boolean).length;
  const profilePercent = Math.round((profileCompletion / 5) * 100);

  return (
    <section className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-[#d8d4c8] bg-white p-6 shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:border-[#314237] dark:bg-[#18251d]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#1f6b45] text-white">
                <UserRound className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{currentUser.profile?.nombre ?? "Mi perfil"}</h1>
                <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Administra tus datos personales y tu ficha de huésped.</p>
              </div>
            </div>
            <Badge variant={isDocumentReady ? "default" : "secondary"}>
              {isDocumentReady ? "Perfil listo" : "Datos pendientes"}
            </Badge>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className={statCardClass}>
              <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">Completado</p>
              <p className="mt-2 text-2xl font-semibold">{profilePercent}%</p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">Reservas</p>
              <p className="mt-2 text-2xl font-semibold">{reservationRows.length}</p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">Pendientes de pago</p>
              <p className="mt-2 text-2xl font-semibold">{pendingReservations}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Datos conectados</CardTitle>
            <CardDescription>Estos datos vienen de Auth, usuarios y huésped.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoLine icon={Mail} label="Email" value={currentUser.email ?? "-"} />
            <InfoLine icon={Phone} label="Teléfono" value={currentUser.phone ?? "-"} />
            <InfoLine icon={IdCard} label="Documento" value={`${guest?.tipo_documento ?? "-"} ${displayDocumentNumber(guest?.numero_documento)}`} />
            <InfoLine icon={CalendarDays} label="Nacimiento" value={formatDate(guest?.fecha_nacimiento)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Editar perfil</CardTitle>
            <CardDescription>Los cambios actualizan Auth, usuarios y la ficha documental de huésped.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileEditForm
              email={currentUser.email ?? ""}
              nombre={currentUser.profile?.nombre ?? ""}
              telefono={currentUser.phone ?? ""}
              guest={guest}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoLine icon={ShieldCheck} label="Cuenta" value={currentUser.profile?.activo ? "Activa" : "Inactiva"} />
              <InfoLine icon={BadgeCheck} label="Documento" value={isDocumentReady ? "Registrado" : "Pendiente"} />
              <InfoLine icon={FileCheck2} label="Comprobantes" value={String((proofs ?? []).length)} />
              <InfoLine icon={CreditCard} label="Pagos aprobados" value={String(approvedPayments)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(notifications ?? []).length === 0 ? (
                <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">No tienes notificaciones recientes.</p>
              ) : (
                notifications?.map((notification) => (
                  <div key={notification.id} className="rounded-lg border border-[#ece4d4] p-3 text-sm dark:border-[#314237]">
                    <p className="font-medium">{notification.mensaje}</p>
                    <p className="mt-1 text-xs text-[#66736a] dark:text-[#b7c0b4]">{formatDateTime(notification.created_at)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reservas recientes</CardTitle>
          <CardDescription>Actividad asociada a tu ficha de huésped.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reservationRows.length === 0 ? (
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Todavía no tienes reservas registradas.</p>
          ) : (
            reservationRows.map((reservation) => (
              <Link
                key={reservation.id}
                href={`/app/reservas/${reservation.id}`}
                className="grid gap-3 rounded-lg border border-[#ece4d4] p-4 text-sm transition hover:border-[#c7a35a] hover:bg-[#fbfaf5] dark:border-[#314237] dark:hover:bg-[#142019] md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold">{reservation.codigo_reserva}</p>
                  <p className="mt-1 text-[#66736a] dark:text-[#b7c0b4]">
                    {formatDate(reservation.fecha_ingreso)} a {formatDate(reservation.fecha_salida)}
                  </p>
                </div>
                <div className="flex items-center gap-3 md:justify-end">
                  <Badge variant={statusVariant(reservation.estado)}>{formatReservaEstado(reservation.estado)}</Badge>
                  <span className="font-semibold">{Number(reservation.precio_total).toFixed(2)} BOB</span>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}

const InfoLine = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3 rounded-lg border border-[#ece4d4] px-3 py-2 dark:border-[#314237]">
    <Icon className="h-4 w-4 text-[#1f6b45] dark:text-[#8fd1a5]" aria-hidden />
    <div className="min-w-0">
      <p className="text-xs text-[#66736a] dark:text-[#b7c0b4]">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  </div>
);
