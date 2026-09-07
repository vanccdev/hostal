"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const defaultMessage = "Hola Hostal Plaza, quisiera recibir información sobre una reserva.";

export const WhatsAppFloatingButton = () => {
  const [message, setMessage] = useState(defaultMessage);
  const whatsappUrl = useMemo(
    () => `https://wa.me/59175453686?text=${encodeURIComponent(message.trim() || defaultMessage)}`,
    [message],
  );

  return (
    <div className="group fixed bottom-20 right-4 z-50 md:bottom-24 md:right-6">
      <div className="invisible absolute bottom-full right-0 mb-3 w-72 rounded-2xl border border-[#d8d4c8] bg-white p-3 opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-[#314237] dark:bg-[#18251d] sm:w-80">
        <p className="text-xs font-bold uppercase tracking-wide text-[#66736a] dark:text-[#b7c0b4]">Mensaje para WhatsApp</p>
        <Input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-label="Mensaje para WhatsApp"
          className="mt-2 bg-white dark:bg-[#101a14]"
        />
        <p className="mt-2 text-xs text-[#66736a] dark:text-[#b7c0b4]">Puedes editarlo antes de contactar al hostal.</p>
      </div>
      <Button asChild className="rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(37,211,102,0.35)] transition-transform hover:scale-105 hover:bg-[#20bd5a] focus-visible:ring-[#25D366]">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Contactar al Hostal Plaza por WhatsApp"
          title="Contactar por WhatsApp"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          <span>WhatsApp</span>
        </a>
      </Button>
    </div>
  );
};
