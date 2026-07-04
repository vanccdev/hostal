export type ActionState<T = unknown> = {
  ok: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
};

export const initialActionState: ActionState = {
  ok: false,
};

