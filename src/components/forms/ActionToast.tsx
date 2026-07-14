"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionState } from "@/app/actions/types";

type ActionToastProps = {
  state: ActionState;
  successTitle?: string;
  errorTitle?: string;
  onSuccess?: () => void;
};

const firstValidationMessage = (errors: ActionState["errors"]) => {
  if (!errors) {
    return undefined;
  }

  return Object.values(errors).flat()[0];
};

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export const ActionToast = ({
  state,
  successTitle = "Operación completada",
  errorTitle = "No se pudo completar",
  onSuccess,
}: ActionToastProps) => {
  const router = useRouter();
  const lastToastKeyRef = useRef<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    const description = state.message ?? (!state.ok ? firstValidationMessage(state.errors) : undefined);

    if (!description) {
      return;
    }

    const toastKey = `${state.ok ? "success" : "error"}:${description}`;

    if (lastToastKeyRef.current === toastKey) {
      return;
    }

    lastToastKeyRef.current = toastKey;

    if (state.ok) {
      toast.success(successTitle, { description });
      onSuccess?.();
      window.setTimeout(() => {
        router.refresh();
      }, 500);
      return;
    }

    toast.error(errorTitle, { description });
  }, [errorTitle, onSuccess, router, state, successTitle]);

  return null;
};
