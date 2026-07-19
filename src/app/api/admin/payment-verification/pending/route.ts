import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canAccessAdminModule } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile?.activo || !canAccessAdminModule(currentUser.profile.rol, "comprobantes")) {
    return NextResponse.json({ ok: false, hasPendingPayments: false }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from("transacciones")
    .select("id", { count: "exact", head: true })
    .eq("estado_verificacion", "por_verificar")
    .eq("tipo", "pago")
    .not("comprobante_url", "is", null);

  if (error) {
    return NextResponse.json({ ok: false, hasPendingPayments: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, hasPendingPayments: (count ?? 0) > 0, count: count ?? 0 },
    { headers: { "cache-control": "no-store" } },
  );
}
