"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const sessionStorageKey = "hostal.analytics.session";
const publicExcludedPaths = ["/admin", "/app", "/login", "/crear-cuenta", "/403"];

const getSessionId = () => {
  const current = window.localStorage.getItem(sessionStorageKey);
  if (current) return current;
  const next = window.crypto.randomUUID();
  window.localStorage.setItem(sessionStorageKey, next);
  return next;
};

export const PublicAnalyticsTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (publicExcludedPaths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return;

    const sessionId = getSessionId();
    const startedAt = Date.now();
    let visitId: string | null = null;
    let finished = false;
    const payload = {
      sessionId,
      path: pathname,
      referrer: document.referrer || null,
      utmSource: searchParams.get("utm_source"),
      utmMedium: searchParams.get("utm_medium"),
      utmCampaign: searchParams.get("utm_campaign"),
    };

    const send = (event: "heartbeat" | "end") => {
      if (!visitId) return;
      const data = JSON.stringify({ event, visitId, durationSeconds: (Date.now() - startedAt) / 1000 });
      if (event === "end" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/visit", new Blob([data], { type: "application/json" }));
        return;
      }
      void fetch("/api/analytics/visit", {
        body: data,
        headers: { "content-type": "application/json" },
        keepalive: event === "end",
        method: "POST",
      });
    };

    void fetch("/api/analytics/visit", {
      body: JSON.stringify({ ...payload, event: "start" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
      .then((response) => response.json() as Promise<{ visitId?: string }>)
      .then((result) => {
        visitId = result.visitId ?? null;
      })
      .catch(() => undefined);

    const intervalId = window.setInterval(() => send("heartbeat"), 15_000);
    const finish = () => {
      if (finished) return;
      finished = true;
      send("end");
    };
    window.addEventListener("pagehide", finish);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") send("heartbeat");
    });

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("pagehide", finish);
      finish();
    };
  }, [pathname, searchParams]);

  return null;
};
