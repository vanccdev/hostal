"use client";

import type { ComponentType, SVGProps } from "react";
import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type NotificationsNavBadgeProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
};

export const NotificationsNavBadge = ({ icon: Icon, label }: NotificationsNavBadgeProps) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    const response = await fetch("/api/admin/notificaciones/unread", {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload: unknown = await response.json();

    if (payload && typeof payload === "object" && "unreadCount" in payload) {
      const nextCount = Number(payload.unreadCount);
      setUnreadCount(Number.isFinite(nextCount) ? Math.max(0, nextCount) : 0);
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      void refreshUnreadCount();
    };

    queueMicrotask(refresh);

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-notifications-nav-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificaciones" },
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
  }, [refreshUnreadCount]);

  const visibleCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            aria-label={`${unreadCount} notificaciones nuevas`}
            className="absolute -right-2.5 -top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_0_2px_rgba(220,38,38,0.18),0_0_10px_rgba(220,38,38,0.45)] dark:border-[#18251d]"
          >
            {visibleCount}
          </span>
        ) : null}
      </span>
      <span className="truncate">{label}</span>
    </>
  );
};
