import { AlertTriangle } from "lucide-react";

export default function DisabledAccountPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f7f7f7] px-6 py-6 dark:bg-[#151515] md:items-center">
      <section className="max-w-md rounded-2xl border border-[#dddddd] bg-white p-8 text-center shadow-[0_12px_32px_rgba(0,0,0,0.10)] dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-[#ff385c]" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-[#222222] dark:text-zinc-100">Cuenta desactivada</h1>
        <p className="mt-3 text-sm text-[#717171] dark:text-[#b0b0b0]">
          Contacta con administración del hostal para reactivar tu acceso.
        </p>
      </section>
    </main>
  );
}
