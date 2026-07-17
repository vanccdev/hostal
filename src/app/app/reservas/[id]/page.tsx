import { notFound } from "next/navigation";
import { ReservationPaymentStatus } from "@/components/app/ReservationPaymentStatus";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { getGuestForUser } from "@/lib/db/current-guest";
import { formatReservaEstado } from "@/lib/reserva-estado";
import { getStaySettings } from "@/lib/stay-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function DetalleReservaPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requirePasswordReady();
  const guest = await getGuestForUser(currentUser.authUserId);
  const { id } = await params;

  if (!guest) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const [{ data: reserva }, staySettings] = await Promise.all([
    supabase
      .from("reservas")
      .select("id,codigo_reserva,huesped_id,habitacion_id,tarifa_id,fecha_ingreso,fecha_salida,num_noches,precio_total,estado,checkin_programado_at,checkout_programado_at,created_at")
      .eq("id", id)
      .eq("huesped_id", guest.id)
      .maybeSingle(),
    getStaySettings(supabase),
  ]);

  if (!reserva) {
    notFound();
  }

  const [{ data: comprobante }, { data: transaccion }] = await Promise.all([
    supabase
      .from("comprobantes")
      .select("id,pdf_url")
      .eq("reserva_id", reserva.id)
      .order("emitido_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("transacciones")
      .select("id,estado_verificacion")
      .eq("reserva_id", reserva.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Detalle de reserva</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Reserva {reserva.codigo_reserva}</p>
      </div>
      <ReservationPaymentStatus
        reservaId={reserva.id}
        codigoReserva={reserva.codigo_reserva}
        estado={reserva.estado}
        createdAt={reserva.created_at}
        timeoutMinutes={staySettings.paymentProofTimeoutMinutes}
        hasProof={Boolean(comprobante)}
        proofUrl={comprobante?.pdf_url}
        userId={currentUser.authUserId}
      />
      <Card>
        <CardHeader>
          <CardTitle>
            {formatDate(reserva.fecha_ingreso)} a {formatDate(reserva.fecha_salida)}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <p>Noches: {reserva.num_noches}</p>
          <p>Total: {reserva.precio_total}</p>
          <p>Habitación: {reserva.habitacion_id}</p>
          <p>Check-in programado: {formatDateTime(reserva.checkin_programado_at)}</p>
          <p>Check-out programado: {formatDateTime(reserva.checkout_programado_at)}</p>
          <p>Comprobante: {comprobante ? "Subido" : "Pendiente"}</p>
          <p>Verificación de pago: {transaccion?.estado_verificacion ?? "Pendiente"}</p>
          <div className="flex items-center gap-2">
            <span>Estado:</span>
            <Badge variant="secondary">{formatReservaEstado(reserva.estado)}</Badge>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
