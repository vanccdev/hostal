"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AvailabilityRealtimeRefreshProps = {
  channelName: string;
  intervalMs?: number;
};

const defaultIntervalMs = 10_000;
const debounceMs = 700;

type AvailabilityVersionPayload = {
  ok: boolean;
  version?: string;
};

export const AvailabilityRealtimeRefresh = ({
  channelName,
  intervalMs = defaultIntervalMs,
}: AvailabilityRealtimeRefreshProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<number | null>(null);
  const versionRef = useRef<string | null>(null);

  useEffect(() => {
    const forceReloadedRoute = () => {
      const params = new URLSearchParams(window.location.search);
      params.set("live", String(Date.now()));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const refresh = (forceRoute = false) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        if (forceRoute) {
          forceReloadedRoute();
          return;
        }

        router.refresh();
      }, debounceMs);
    };

    const refreshImmediately = (forceRoute = false) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (forceRoute) {
        forceReloadedRoute();
        return;
      }

      router.refresh();
    };

    const checkAvailabilityVersion = async () => {
      try {
        const response = await fetch("/api/availability/version", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as AvailabilityVersionPayload;

        if (!payload.ok || !payload.version) {
          return;
        }

        if (versionRef.current === null) {
          versionRef.current = payload.version;
          return;
        }

        if (versionRef.current !== payload.version) {
          versionRef.current = payload.version;
          refreshImmediately(true);
        }
      } catch {
        refreshImmediately();
      }
    };

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => refresh(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "bloqueos_fechas" }, () => refresh(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "habitaciones" }, () => refresh(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "estado_habitaciones" }, () => refresh(true))
      .subscribe();
    const intervalId = window.setInterval(checkAvailabilityVersion, intervalMs);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkAvailabilityVersion();
      }
    };

    void checkAvailabilityVersion();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkAvailabilityVersion);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkAvailabilityVersion);
      void supabase.removeChannel(channel);
    };
  }, [channelName, intervalMs, pathname, router]);

  return null;
};
