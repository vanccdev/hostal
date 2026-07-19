import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canAccessAdminModule } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile?.activo || !canAccessAdminModule(currentUser.profile.rol, "notificaciones")) {
    return NextResponse.json({ ok: false, unreadCount: 0 }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("leida", false);

  if (error) {
    return NextResponse.json({ ok: false, unreadCount: 0, message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, unreadCount: count ?? 0 },
    { headers: { "cache-control": "no-store" } },
  );
}
