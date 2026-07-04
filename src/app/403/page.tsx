import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="max-w-md text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-zinc-700 dark:text-zinc-300" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-100">Acceso restringido</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Tu rol no tiene permiso para entrar a este módulo.</p>
        <Button asChild className="mt-6">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </section>
    </main>
  );
}
