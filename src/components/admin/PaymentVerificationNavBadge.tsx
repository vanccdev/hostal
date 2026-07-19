"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PaymentVerificationNavBadgeProps = {
  label: string;
};

export const PaymentVerificationNavBadge = ({ label }: PaymentVerificationNavBadgeProps) => {
  const [hasPendingPayments, setHasPendingPayments] = useState(false);

  const refreshPendingPayments = useCallback(async () => {
    const response = await fetch("/api/admin/payment-verification/pending", {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload: unknown = await response.json();

    if (payload && typeof payload === "object" && "hasPendingPayments" in payload) {
      setHasPendingPayments(payload.hasPendingPayments === true);
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      void refreshPendingPayments();
    };

    queueMicrotask(() => {
      refresh();
    });

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-payment-verification-nav-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones" },
        () => {
          refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transacciones" },
        () => {
          refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comprobantes" },
        () => {
          refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservas" },
        () => {
          refresh();
        },
      )
      .subscribe();
    const intervalId = window.setInterval(refresh, 5000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", refresh);
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
