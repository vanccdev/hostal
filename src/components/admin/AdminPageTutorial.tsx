"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp, LoaderCircle } from "lucide-react";
import type { Driver } from "driver.js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminNavigation, type AdminNavigationHref } from "@/lib/admin-navigation";
import { adminTutorials } from "@/lib/admin-tutorials";
import { canAccessAdminModule } from "@/lib/permissions";
import type { UserRole } from "@/types/database";
import "driver.js/dist/driver.css";
import "./admin-tutorial.css";

export const AdminPageTutorial = ({ role }: { role: UserRole }) => {
  const pathname = usePathname();
  const page = adminNavigation.find((item) => item.href === pathname);

  if (!page || !canAccessAdminModule(role, page.module)) return null;

  return <PageTutorial key={pathname} href={page.href} label={page.label} role={role} />;
};

const PageTutorial = ({ href, label, role }: { href: AdminNavigationHref; label: string; role: UserRole }) => {
  const [loading, setLoading] = useState(false);
  const driverRef = useRef<Driver | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);
  const starting = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  const startTutorial = async () => {
    if (starting.current || driverRef.current?.isActive()) return;
    starting.current = true;
    setLoading(true);

    try {
      const { driver } = await import("driver.js");
      if (!mounted.current) return;

      const page = document.getElementById("admin-page");
      if (!page) return;
      const steps = adminTutorials[href].flatMap((step) => {
        if (step.roles && !step.roles.includes(role)) return [];
        const element = step.target ? page.querySelector<HTMLElement>(step.target) : undefined;
        // Skip absent controls (empty lists, permissions) and hidden mobile/desktop UI.
        if (step.target && (!element || element.getClientRects().length === 0)) return [];
        return [{ element: element ?? undefined, popover: { title: step.title, description: step.description } }];
      });

      if (steps.length === 0) {
        toast.info("Espera a que termine de cargar la página y vuelve a abrir el tutorial.");
        return;
      }

      driverRef.current = driver({
        steps: [...steps, {
          element: buttonRef.current ?? undefined,
          popover: { title: "Consulta esta guía cuando la necesites", description: "Puedes volver a abrir Ver tutorial en esta página. Usa Anterior y Siguiente para recorrer la guía, o Escape y el botón de cierre para salir." },
        }],
        popoverClass: "hostal-tutorial",
        showProgress: true,
        progressText: "{{current}} de {{total}}",
        nextBtnText: "Siguiente",
        prevBtnText: "Anterior",
        doneBtnText: "Terminar",
        allowClose: true,
        allowKeyboardControl: true,
        disableActiveInteraction: true,
        skipMissingElement: true,
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        overlayOpacity: 0.6,
        stagePadding: 6,
        stageRadius: 10,
        onPopoverRender: (popover) => {
          popover.wrapper.lang = "es";
          popover.closeButton.setAttribute("aria-label", "Cerrar tutorial");
        },
        onDestroyed: () => {
          driverRef.current = null;
          if (mounted.current) buttonRef.current?.focus({ preventScroll: true });
        },
      });
      driverRef.current.drive();
    } catch {
      if (mounted.current) toast.error("No se pudo abrir el tutorial. Vuelve a intentarlo.");
    } finally {
      starting.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-2" data-tour="tutorial-launcher">
      <Button ref={buttonRef} type="button" variant="outline" onClick={startTutorial} disabled={loading} aria-label={`Ver tutorial de ${label}`}>
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CircleHelp className="h-4 w-4" aria-hidden="true" />}
        {loading ? "Abriendo tutorial…" : "Ver tutorial"}
      </Button>
    </div>
  );
};
