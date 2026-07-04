"use client";

import type { ActionState } from "@/app/actions/types";

type FormMessageProps = {
  state: ActionState;
  field?: string;
};

export const FormMessage = ({ state, field }: FormMessageProps) => {
  const message = field ? state.errors?.[field]?.[0] : state.message;

  if (!message) {
    return null;
  }

  return <p className="text-sm text-red-600">{message}</p>;
};

