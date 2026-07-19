import Link from "next/link";
import { connection } from "next/server";
import { ReservaForm } from "@/components/forms/ReservaForm";
import { AvailabilityRealtimeRefresh } from "@/components/reservations/AvailabilityRealtimeRefresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { formatDate } from "@/lib/datetime";
import { getGuestForUser } from "@/lib/db/current-guest";
import { formatReservaEstado } from "@/lib/reserva-estado";
import { getStaySettings } from "@/lib/stay-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function ClientDashboardPage() {
  await connection();

  const currentUser = await requirePasswordReady();
  const supabase = createSupabaseAdminClient();
  const guest = await getGuestForUser(currentUser.authUserId);
  const [
    { data: reservations },
    { data: habitaciones },
    { data: tarifas },
    { data: reservas },
    { data: bloqueos },
    staySettings,
  ] = await Promise.all([
    guest
      ? supabase
          .from("reservas")
          .select("id,fecha_ingreso,fecha_salida,estado,precio_total")
          .eq("huesped_id", guest.id)
          .order("fecha_ingreso")
          .limit(5)
      : Promise.resolve({ data: [] }),
    supabase.from("habitaciones").select("id,numero,tipo,tarifa_id,piso,capacidad_max,descripcion,activa,created_at").order("numero"),
    supabase
      .from("tarifas")
      .select("id,habitacion_tipo,temporada,precio_noche,peso,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
      .eq("activa", true)
      .order("habitacion_tipo"),
    supabase
      .from("reservas")
      .select("id,habitacion_id,fecha_ingreso,fecha_salida,estado,checkin_programado_at,checkout_programado_at")
      .in("estado", ["pendiente_pago", "confirmada", "checkin"]),
    supabase.from("bloqueos_fechas").select("id,habitacion_id,fecha_inicio,fecha_fin"),
    getStaySettings(supabase),
  ]);
  const habitacionIds = (habitaciones ?? []).map((habitacion) => habitacion.id);
  const { data: imagenes } =
    habitacionIds.length > 0
      ? await supabase
          .from("img_habitaciones")
          .select("id,habitacion_id,url")
          .in("habitacion_id", habitacionIds)
          .order("created_at")
      : { data: [] };

  return (
    <section className="space-y-6">
      <AvailabilityRealtimeRefresh channelName="client-dashboard-availability-refresh" />
      <div>
        <h1 className="text-2xl font-semibold">Hola, {currentUser.profile?.nombre}</h1>
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
          Elige una habitación y completa tu reserva desde tu cuenta.
        </p>
      </div>

      <Card id="fechas-y-habitacion" className="scroll-mt-4">
        <CardHeader>
          <CardTitle>Nueva reserva</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservaForm
            mode="cliente"
            habitaciones={habitaciones ?? []}
            tarifas={tarifas ?? []}
            imagenes={imagenes ?? []}
            reservas={reservas ?? []}
            bloqueos={bloqueos ?? []}
            staySettings={staySettings}
            scrollTargetId="fechas-y-habitacion"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximas reservas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(reservations ?? []).length === 0 ? (
            <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">No tienes reservas registradas.</p>
          ) : (
            reservations?.map((reservation) => (
              <Link
                key={reservation.id}
                href={`/app/reservas/${reservation.id}`}
                className="block rounded-2xl border border-[#d8d4c8] bg-white p-4 text-sm font-medium text-[#18221b] transition hover:border-[#c7a35a] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:border-[#314237] dark:bg-[#18251d] dark:text-zinc-100"
              >
                {formatDate(reservation.fecha_ingreso)} a {formatDate(reservation.fecha_salida)} ·{" "}
                {formatReservaEstado(reservation.estado)}
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
