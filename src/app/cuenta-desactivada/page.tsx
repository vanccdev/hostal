import { AlertTriangle } from "lucide-react";

export default function DisabledAccountPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-background px-6 py-6 md:items-center">
      <section className="max-w-md text-center">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-zinc-700 dark:text-zinc-300" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-100">Cuenta desactivada</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Contacta con administración del hostal para reactivar tu acceso.
        </p>
      </section>
    </main>
  );
}
