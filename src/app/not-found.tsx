import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BedDouble, MapPin, SearchX } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "La página que buscas no está disponible. Regresa a Hostal Plaza Camargo y encuentra tu próximo hospedaje en Bolivia.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#f6f1e6] px-4 py-6 text-[#18221b] dark:bg-[#101a14] dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#c7a35a]/20 blur-3xl dark:bg-[#c7a35a]/10" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[#2f6f4e]/15 blur-3xl dark:bg-[#2f6f4e]/20" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Volver al inicio de Hostal Plaza">
            <BrandLogo />
          </Link>
          <span className="hidden items-center gap-2 text-sm font-medium text-[#66736a] dark:text-[#b7c0b4] sm:inline-flex">
            <MapPin className="h-4 w-4 text-[#c7a35a]" aria-hidden="true" />
            Camargo, Bolivia
          </span>
        </header>

        <section className="flex flex-1 items-center justify-center py-16">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-[2.5rem] border border-[#d8d4c8] bg-white/80 shadow-[0_24px_70px_rgba(24,34,27,0.12)] dark:border-[#314237] dark:bg-[#18251d]/80">
              <div className="absolute inset-6 rounded-[2rem] border border-dashed border-[#c7a35a]/60" />
              <div className="relative flex flex-col items-center gap-3 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f4ecd8] text-[#a9822f] dark:bg-[#2b2618] dark:text-[#e8d59a]">
                  <SearchX className="h-10 w-10" aria-hidden="true" />
                </div>
                <p className="text-7xl font-bold tracking-tight text-[#2f6f4e] dark:text-[#c7a35a]">404</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#66736a] dark:text-[#b7c0b4]">
                  <BedDouble className="h-4 w-4" aria-hidden="true" />
                  Habitación fuera de ruta
                </div>
              </div>
            </div>

            <div className="max-w-xl space-y-5 text-center lg:text-left">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#a9822f]">Perdimos el camino</p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Esta página no está disponible</h1>
              <p className="text-base leading-7 text-[#66736a] dark:text-[#b7c0b4]">
                Parece que este enlace tomó otra ruta. Vuelve al Hostal Plaza para consultar habitaciones, disponibilidad y opciones de hospedaje en Camargo, Bolivia.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Button asChild size="lg">
                  <Link href="/">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Volver al inicio
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/#habitaciones">Ver habitaciones</Link>
                </Button>
              </div>
              <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
                ¿Necesitas ayuda? Escríbenos por WhatsApp desde el botón de contacto.
              </p>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-1 border-t border-[#d8d4c8] pt-4 text-xs text-[#66736a] dark:border-[#314237] dark:text-[#b7c0b4] sm:flex-row sm:items-center sm:justify-between">
          <span>Hostal Plaza · Camargo, Chuquisaca, Bolivia</span>
          <span>Hospedaje para descansar y descubrir la región.</span>
        </footer>
      </div>
    </main>
  );
}
