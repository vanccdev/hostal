import { NextResponse } from "next/server";
import { requirePasswordReady } from "@/lib/auth/require-role";
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

  return NextResponse.json(
    {
      ok: true,
      estado: reserva.estado,
      hasProof: Boolean(comprobante),
      proofUrl: comprobante?.pdf_url ?? null,
      paymentVerificationStatus: transaccion?.estado_verificacion ?? null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
