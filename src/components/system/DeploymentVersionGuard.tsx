"use client";

import { useEffect } from "react";
import { unstable_isUnrecognizedActionError } from "next/navigation";

export const DeploymentVersionGuard = () => {
  useEffect(() => {
    let reloading = false;

    const reloadForCurrentDeployment = (error: unknown) => {
      if (reloading || !unstable_isUnrecognizedActionError(error)) {
        return;
      }

      reloading = true;
      window.location.reload();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (unstable_isUnrecognizedActionError(event.reason)) {
        event.preventDefault();
        reloadForCurrentDeployment(event.reason);
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (unstable_isUnrecognizedActionError(event.error)) {
        event.preventDefault();
        reloadForCurrentDeployment(event.error);
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
};
