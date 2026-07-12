import Link from "next/link";
import { ArrowRight, Building2, ExternalLink, LogIn, MapPin } from "lucide-react";
import { HostalLocationMap } from "@/components/public/HostalLocationMap";
import { PublicBookingCatalog } from "@/components/public/PublicBookingCatalog";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPathByRole } from "@/lib/auth/redirect-by-role";
import { isStaffRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function Home() {
  const [currentUser, supabase] = await Promise.all([getCurrentUser(), Promise.resolve(createSupabaseAdminClient())]);
  const [{ data: habitaciones }, { data: tarifas }, { data: reservas }, { data: bloqueos }] = await Promise.all([
    supabase
      .from("habitaciones")
      .select("id,numero,tipo,tarifa_id,piso,capacidad_max,descripcion,activa,created_at")
      .neq("activa", false)
      .order("numero"),
    supabase
      .from("tarifas")
      .select("id,habitacion_tipo,temporada,precio_noche,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
      .eq("activa", true)
      .order("habitacion_tipo"),
    supabase
      .from("reservas")
      .select("id,habitacion_id,fecha_ingreso,fecha_salida,estado")
      .in("estado", ["pendiente_pago", "confirmada", "checkin"]),
    supabase.from("bloqueos_fechas").select("id,habitacion_id,fecha_inicio,fecha_fin"),
  ]);
  const habitacionIds = (habitaciones ?? []).map((habitacion) => habitacion.id);
  const { data: imagenes } =
    habitacionIds.length > 0
      ? await supabase
          .from("img_habitaciones")
          .select("id,habitacion_id,url")
          .in("habitacion_id", habitacionIds)
          .order("created_at")
      : { data: [] };
  const accountPath = currentUser ? getPathByRole(currentUser.profile) : null;
  const continueHref =
    currentUser?.profile?.rol === "cliente"
      ? "/app/reservas/nueva"
      : currentUser?.profile && isStaffRole(currentUser.profile.rol)
        ? "/admin/reservas/nueva"
        : "/login?next=/app/reservas/nueva";

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-[#222222] dark:bg-[#151515] dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-[#dddddd] bg-white/95 backdrop-blur dark:border-[#3a3a3a] dark:bg-[#151515]/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff385c] text-white">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </span>
            Hostal
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="#habitaciones">Habitaciones</Link>
            </Button>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="#ubicacion">Ubicación</Link>
            </Button>
            {accountPath ? (
              <Button asChild variant="outline">
                <Link href={accountPath}>Mi cuenta</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/login">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Iniciar sesión
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_24rem] lg:px-8 lg:py-14">
        <div className="space-y-5">
          <BadgeLike>Reservas online</BadgeLike>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
              Encuentra tu habitación y reserva cuando estés listo.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[#717171] dark:text-[#b0b0b0]">
              Explora fotos, tarifas y disponibilidad sin iniciar sesión. Te pediremos tu cuenta solo al confirmar la reserva.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="#habitaciones">
                Ver habitaciones
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Iniciar sesión
              </Link>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-[#dddddd] bg-white p-5 shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
          <p className="text-sm font-semibold text-[#222222] dark:text-zinc-100">Cómo funciona</p>
          <div className="mt-4 space-y-4 text-sm text-[#717171] dark:text-[#b0b0b0]">
            <p>1. Elige fechas y revisa habitaciones disponibles.</p>
            <p>2. Selecciona una habitación con tarifa activa.</p>
            <p>3. Inicia sesión recién al confirmar; conservamos lo que elegiste.</p>
          </div>
        </div>
      </section>

      <PublicBookingCatalog
        habitaciones={habitaciones ?? []}
        tarifas={tarifas ?? []}
        imagenes={imagenes ?? []}
        reservas={reservas ?? []}
        bloqueos={bloqueos ?? []}
        continueHref={continueHref}
      />

      <section id="ubicacion" className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.4fr] lg:px-8 lg:py-14">
        <div className="space-y-4">
          <BadgeLike>Ubicación</BadgeLike>
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-normal text-[#222222] dark:text-zinc-100">Estamos en Plaza, Camargo.</h2>
            <p className="max-w-xl text-base leading-7 text-[#717171] dark:text-[#b0b0b0]">
              Encuéntranos cerca del centro de Camargo para llegar fácil antes del check-in o moverte a pie por la zona.
            </p>
          </div>
          <div className="space-y-2 rounded-2xl border border-[#dddddd] bg-white p-4 text-sm shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
            <p className="flex items-center gap-2 font-semibold text-[#222222] dark:text-zinc-100">
              <MapPin className="h-4 w-4 text-[#ff385c]" aria-hidden="true" />
              Hostal Plaza
            </p>
            <p className="text-[#717171] dark:text-[#b0b0b0]">Camargo, Chuquisaca</p>
            <p className="font-mono text-xs text-[#717171] dark:text-[#b0b0b0]">-20.641224228393003, -65.20948944626011</p>
            <Button asChild variant="outline" className="mt-3 w-full justify-center rounded-md sm:w-auto">
              <Link href="https://maps.app.goo.gl/AbQxFxgTE6t16oDo7" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Ver en Google Maps
              </Link>
            </Button>
          </div>
        </div>
        <HostalLocationMap />
      </section>
    </main>
  );
}

const BadgeLike = ({ children }: { children: React.ReactNode }) => (
  <p className="inline-flex rounded-full bg-[#fff1f3] px-3 py-1 text-sm font-semibold text-[#b0133e] dark:bg-[#3a1f27] dark:text-[#ffb3c0]">
    {children}
  </p>
);
