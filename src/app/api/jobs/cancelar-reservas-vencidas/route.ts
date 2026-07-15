import { NextResponse } from "next/server";
import { cancelExpiredPendingReservations } from "@/lib/db/auto-cancel-reservas";
import { serverEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const handleAutoCancel = async (request: Request) => {
  const cronSecret = serverEnv.cronSecret();

  if (!cronSecret) {
    return NextResponse.json({ ok: false, message: "CRON_SECRET no está configurado." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const result = await cancelExpiredPendingReservations(createSupabaseAdminClient());

  return NextResponse.json({ ok: true, ...result });
};

export const GET = handleAutoCancel;
export const POST = handleAutoCancel;
