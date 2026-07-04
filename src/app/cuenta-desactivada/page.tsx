import { AlertTriangle } from "lucide-react";

export default function DisabledAccountPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <section className="max-w-md text-center">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-zinc-700" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-zinc-950">Cuenta desactivada</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Contacta con administración del hostal para reactivar tu acceso.
        </p>
      </section>
    </main>
  );
}

