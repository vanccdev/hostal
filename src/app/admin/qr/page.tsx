import { QrPaymentManager } from "@/components/admin/QrPaymentManager";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { QrPago } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function QrPaymentsPage() {
  await requireAdminModule("qr");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("qr_pagos").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(`No se pudo cargar la gestión de QR: ${error.message}`);
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">QR de pago</h1>
        <p className="text-sm text-muted-foreground">Administra el código QR que se muestra después de crear una reserva.</p>
      </div>
      <QrPaymentManager qrPayments={(data ?? []) as QrPago[]} />
    </section>
  );
}
