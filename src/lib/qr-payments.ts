import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, QrPago } from "@/types/database";

export const QR_PAYMENT_BUCKET = "qr";

export const getActiveQrPayment = async (supabase: SupabaseClient<Database>): Promise<QrPago | null> => {
  const { data } = await supabase
    .from("qr_pagos")
    .select("*")
    .eq("activa", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
};
