import { NextResponse } from "next/server";
import { cancelExpiredPendingReservations } from "@/lib/db/auto-cancel-reservas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const latestTimestamp = (values: Array<string | null | undefined>) => {
  const timestamps = values.filter((value): value is string => typeof value === "string" && value.length > 0);

  return timestamps.sort((a, b) => b.localeCompare(a))[0] ?? "";
};

export async function GET() {
  const supabase = createSupabaseAdminClient();

  await cancelExpiredPendingReservations(supabase);

  const [
    { data: reservas },
    { data: cancelaciones },
    { data: bloqueos },
    { data: habitaciones },
    { count: activeReservationsCount },
  ] = await Promise.all([
    supabase
      .from("reservas")
      .select("id,created_at,updated_at")
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1),
    supabase.from("cancelaciones").select("id,created_at").order("created_at", { ascending: false }).limit(1),
    supabase.from("bloqueos_fechas").select("id,created_at").order("created_at", { ascending: false }).limit(1),
    supabase.from("habitaciones").select("id,created_at").order("created_at", { ascending: false }).limit(1),
    supabase
      .from("reservas")
      .select("id", { count: "exact", head: true })
      .in("estado", ["pendiente_pago", "confirmada", "checkin"]),
  ]);
  const version = [
    latestTimestamp([reservas?.[0]?.created_at, reservas?.[0]?.updated_at]),
    latestTimestamp([cancelaciones?.[0]?.created_at]),
    latestTimestamp([bloqueos?.[0]?.created_at]),
    latestTimestamp([habitaciones?.[0]?.created_at]),
    String(activeReservationsCount ?? 0),
  ].join("|");

  return NextResponse.json(
    { ok: true, version },
    { headers: { "cache-control": "no-store" } },
  );
}
