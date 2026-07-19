import { NextResponse } from "next/server";
import { requirePasswordReady } from "@/lib/auth/require-role";
import { cancelExpiredPendingReservations } from "@/lib/db/auto-cancel-reservas";
import { getGuestForUser } from "@/lib/db/current-guest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requirePasswordReady();
  const guest = await getGuestForUser(currentUser.authUserId);
  const { id } = await params;

  if (!guest) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: reservaAccess, error: reservaAccessError } = await supabase
    .from("reservas")
    .select("id")
    .eq("id", id)
    .eq("huesped_id", guest.id)
    .maybeSingle();

  if (reservaAccessError) {
    return NextResponse.json({ ok: false, message: reservaAccessError.message }, { status: 500 });
  }

  if (!reservaAccess) {
    return NextResponse.json({ ok: false, message: "Reserva no encontrada." }, { status: 404 });
  }

  await cancelExpiredPendingReservations(supabase, { reservationId: id });

  const { data: reserva, error: reservaError } = await supabase
    .from("reservas")
    .select("id,estado")
    .eq("id", id)
    .eq("huesped_id", guest.id)
    .maybeSingle();

  if (reservaError) {
    return NextResponse.json({ ok: false, message: reservaError.message }, { status: 500 });
  }

  if (!reserva) {
    return NextResponse.json({ ok: false, message: "Reserva no encontrada." }, { status: 404 });
  }

  const { data: transaccion } = await supabase
    .from("transacciones")
    .select("id,estado_verificacion,comprobante_url")
    .eq("reserva_id", reserva.id)
    .eq("tipo", "pago")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: comprobante } = transaccion?.id
    ? await supabase
        .from("comprobantes")
        .select("id,pdf_url")
        .eq("transaccion_id", transaccion.id)
        .maybeSingle()
    : { data: null };
  const activeProof =
    Boolean(transaccion?.comprobante_url ?? comprobante?.pdf_url) &&
    transaccion?.estado_verificacion !== "rechazada";
  const activeProofUrl = activeProof ? (transaccion?.comprobante_url ?? comprobante?.pdf_url ?? null) : null;

  return NextResponse.json(
    {
      ok: true,
      estado: reserva.estado,
      hasProof: activeProof,
      proofUrl: activeProofUrl,
      paymentVerificationStatus: transaccion?.estado_verificacion ?? null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
