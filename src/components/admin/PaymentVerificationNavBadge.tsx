"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PaymentVerificationNavBadgeProps = {
  label: string;
};

export const PaymentVerificationNavBadge = ({ label }: PaymentVerificationNavBadgeProps) => {
  const [hasPendingPayments, setHasPendingPayments] = useState(false);

  const refreshPendingPayments = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { count, error } = await supabase
      .from("transacciones")
      .select("id", { count: "exact", head: true })
      .eq("estado_verificacion", "por_verificar")
      .eq("tipo", "pago")
      .not("comprobante_url", "is", null);

    if (!error) {
      setHasPendingPayments((count ?? 0) > 0);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshPendingPayments();
    });

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-payment-verification-nav-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones" },
        () => {
          void refreshPendingPayments();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transacciones" },
        () => {
          void refreshPendingPayments();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comprobantes" },
        () => {
          void refreshPendingPayments();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservas" },
        () => {
          void refreshPendingPayments();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshPendingPayments]);

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="truncate">{label}</span>
      {hasPendingPayments ? (
        <span
          aria-label="Hay pagos pendientes de verificacion"
          className="relative h-3 w-3 shrink-0 rounded-full border border-white bg-red-600 shadow-[0_0_0_2px_rgba(220,38,38,0.18),0_0_10px_rgba(220,38,38,0.45)] dark:border-[#18251d] dark:shadow-[0_0_0_2px_rgba(248,113,113,0.18),0_0_10px_rgba(248,113,113,0.35)]"
        >
          <span className="absolute inset-0 rounded-full bg-red-400/45" />
        </span>
      ) : null}
    </span>
  );
};
