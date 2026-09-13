import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const maxText = (value: unknown, length: number) =>
  typeof value === "string" ? value.slice(0, length) : null;

const getDeviceType = (userAgent: string) => {
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  if (/mobile|android|iphone/i.test(userAgent)) return "mobile";
  return "desktop";
};

const getBrowser = (userAgent: string) => {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/chrome\//i.test(userAgent)) return "Chrome";
  if (/firefox\//i.test(userAgent)) return "Firefox";
  if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) return "Safari";
  if (/opera|opr\//i.test(userAgent)) return "Opera";
  return "Otro";
};

const getSource = (request: NextRequest, utmSource: string | null, referrer: string | null) => {
  if (utmSource) return utmSource.toLowerCase();
  if (!referrer) return "directo";

  try {
    const hostname = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    if (hostname.includes("google.")) return "google";
    if (hostname.includes("facebook.") || hostname.includes("instagram.")) return "meta";
    if (hostname.includes("tiktok.")) return "tiktok";
    if (hostname.includes("whatsapp.")) return "whatsapp";
    return hostname;
  } catch {
    return request.headers.get("referer") ? "referido" : "directo";
  }
};

const getCountryCode = (request: NextRequest) =>
  maxText(
    request.headers.get("x-vercel-ip-country") ??
      request.headers.get("cf-ipcountry") ??
      request.headers.get("x-country-code"),
    2,
  )?.toUpperCase() ?? null;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const event = body.event === "end" || body.event === "heartbeat" ? body.event : "start";
    const visitId = maxText(body.visitId, 80);
    const sessionId = maxText(body.sessionId, 80);
    const path = maxText(body.path, 200);

    if (event === "start" && (!sessionId || !path)) {
      return NextResponse.json({ error: "Visita inválida." }, { status: 400 });
    }

    const validSessionId = sessionId ?? "";
    const validPath = path ?? "/";

    const admin = createSupabaseAdminClient();

    if (event === "start") {
      const userAgent = request.headers.get("user-agent") ?? "";
      const referrer = maxText(body.referrer, 500);
      const utmSource = maxText(body.utmSource, 100);
      const { data, error } = await admin
        .from("analytics_visits")
        .insert({
          session_id: validSessionId,
          path: validPath,
          referrer,
          source: getSource(request, utmSource, referrer),
          utm_source: utmSource,
          utm_medium: maxText(body.utmMedium, 100),
          utm_campaign: maxText(body.utmCampaign, 150),
          country_code: getCountryCode(request),
          device_type: getDeviceType(userAgent),
          browser: getBrowser(userAgent),
        })
        .select("id")
        .single();

      if (error) throw error;
      return NextResponse.json({ visitId: data.id });
    }

    if (!visitId) return NextResponse.json({ error: "Visita inválida." }, { status: 400 });

    const duration = Math.max(0, Math.min(86_400, Number(body.durationSeconds) || 0));
    const { error } = await admin
      .from("analytics_visits")
      .update({
        duration_seconds: Math.round(duration),
        last_seen_at: new Date().toISOString(),
        is_bounce: duration < 10,
      })
      .eq("id", visitId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics visit error", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "No se pudo registrar la visita." }, { status: 500 });
  }
}
