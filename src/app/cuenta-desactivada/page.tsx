import { AlertTriangle } from "lucide-react";

export default function DisabledAccountPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f6f1e6] px-6 py-6 dark:bg-[#101a14] md:items-center">
      <section className="max-w-md rounded-2xl border border-[#d8d4c8] bg-white p-8 text-center shadow-[0_12px_32px_rgba(0,0,0,0.10)] dark:border-[#314237] dark:bg-[#18251d]">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-[#c7a35a]" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-[#18221b] dark:text-zinc-100">Cuenta desactivada</h1>
        <p className="mt-3 text-sm text-[#66736a] dark:text-[#b7c0b4]">
          Contacta con administración del hostal para reactivar tu acceso.
        </p>
      </section>
    </main>
  );
}
