import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f7f7f7] px-6 py-6 dark:bg-[#151515] md:items-center">
      <section className="max-w-md rounded-2xl border border-[#dddddd] bg-white p-8 text-center shadow-[0_12px_32px_rgba(0,0,0,0.10)] dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-[#ff385c]" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-[#222222] dark:text-zinc-100">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[#717171] dark:text-[#b0b0b0]">Tu rol no tiene permiso para entrar a este módulo.</p>
        <Button asChild className="mt-6">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </section>
    </main>
  );
}
