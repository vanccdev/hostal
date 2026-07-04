import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchWebhook, type DomainEvent } from "@/lib/webhooks/dispatch";
import type { Database, Json } from "@/types/database";

type EmitEventInput = {
  event: DomainEvent;
  title: string;
  message: string;
  userId?: string | null;
  payload?: Json;
};

export const emitEvent = async (supabase: SupabaseClient<Database>, input: EmitEventInput) => {
  const metadata = input.payload ?? null;

  const { error } = await supabase.from("notificaciones").insert({
    usuario_id: input.userId ?? null,
    tipo: input.event,
    titulo: input.title,
    mensaje: input.message,
    metadata,
    leida: false,
  });

  if (error) {
    console.error("notification insert failed", error.message);
  }

  await dispatchWebhook(input.event, metadata);
};

