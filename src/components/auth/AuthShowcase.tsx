import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AuthShowcaseProps = {
  title: string;
  description: string;
  eyebrow?: string;
  children: ReactNode;
  footer: ReactNode;
  cardClassName?: string;
};

const photoStrip = [
  {
    src: "/dentro-hostal/desayuno.jpg",
    alt: "Desayuno servido en el Hostal Plaza",
    label: "Desayuno",
  },
  {
    src: "/dentro-hostal/chimenea.jpg",
    alt: "Sala con chimenea del Hostal Plaza",
    label: "Sala con chimenea",
  },
  {
    src: "/dentro-hostal/comedor.jpg",
    alt: "Comedor del Hostal Plaza",
    label: "Comedor",
  },
];

export const AuthShowcase = ({
  title,
  description,
  eyebrow = "Acceso seguro",
  children,
  footer,
  cardClassName,
}: AuthShowcaseProps) => (
  <main className="relative min-h-screen overflow-hidden bg-[#102317] text-white">
    <Image
      src="/dentro-hostal/vista1.jpg"
      alt="Patio interior del Hostal Plaza en Camargo"
      fill
      sizes="100vw"
      className="object-cover [animation:hostal-image-pan_18s_ease-in-out_infinite_alternate]"
      priority
    />
    <div className="absolute inset-0 bg-[#102317]/68" />
    <div className="absolute inset-0 bg-gradient-to-br from-[#102317]/88 via-[#102317]/28 to-[#a9822f]/24" />
    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#102317]/92 to-transparent" />

    <div className="relative mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <section className="flex min-h-[calc(100vh-2.5rem)] flex-col justify-between gap-7 lg:min-h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-full bg-white/12 px-3 py-2 backdrop-blur-md transition hover:bg-white/18"
          >
            <BrandLogo imageClassName="h-9 w-9" />
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/18"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </Link>
        </div>

        <div className="w-full space-y-5 [animation:hostal-fade-up_650ms_ease-out_both]">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#e8d59a]/18 px-3 py-1 text-sm font-semibold text-[#f5e8b5] backdrop-blur-md">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Hostal Plaza Camargo
          </p>
          <div className="max-w-2xl space-y-3">
            <h1 className="text-4xl font-semibold leading-[1.05] text-white sm:text-5xl">
              Tu estadía empieza con una vista tranquila del hostal.
            </h1>
            <p className="text-base leading-7 text-[#f6f1e6]/88">{description}</p>
          </div>

          <div className="grid max-w-6xl items-center gap-5 lg:grid-cols-[minmax(20rem,27rem)_minmax(20rem,26rem)]">
            <Card
              className={cn(
                "w-full max-w-[27rem] overflow-hidden rounded-[8px] border-white/24 bg-white/14 text-white shadow-[0_26px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl dark:border-white/18 dark:bg-[#102317]/38",
                cardClassName,
              )}
            >
              <CardHeader className="gap-2 p-6 pb-4">
                <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#e8d59a]/18 px-3 py-1 text-xs font-semibold text-[#f5e8b5]">
                  {eyebrow}
                </p>
                <CardTitle className="text-3xl text-white">{title}</CardTitle>
                <CardDescription className="text-base leading-6 text-white/76">{description}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {children}
                {footer}
              </CardContent>
            </Card>

            <div className="grid max-w-[26rem] grid-cols-[1.15fr_0.85fr] gap-3 sm:min-h-80">
              <div className="group relative min-h-72 overflow-hidden rounded-[8px] border border-white/16 bg-white/10 shadow-[0_14px_38px_rgba(0,0,0,0.2)] [animation:hostal-float_7s_ease-in-out_infinite]">
                <Image
                  src={photoStrip[0].src}
                  alt={photoStrip[0].alt}
                  fill
                  sizes="(min-width: 1024px) 19vw, 55vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#102317]/62 via-transparent to-transparent" />
                <p className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-white">{photoStrip[0].label}</p>
              </div>

              <div className="grid grid-rows-2 gap-3">
                {photoStrip.slice(1).map((photo, index) => (
                  <div
                    key={photo.src}
                    className="group relative min-h-0 overflow-hidden rounded-[8px] border border-white/16 bg-white/10 shadow-[0_14px_38px_rgba(0,0,0,0.2)] [animation:hostal-float_7s_ease-in-out_infinite]"
                    style={{
                      animationDelay: `${(index + 1) * 0.7}s`,
                    }}
                  >
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="(min-width: 1024px) 12vw, 38vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#102317]/62 via-transparent to-transparent" />
                    <p className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-white">{photo.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-white/88">
          <span className="rounded-full bg-white/12 px-3 py-2 backdrop-blur-md">Reservas</span>
          <span className="rounded-full bg-white/12 px-3 py-2 backdrop-blur-md">Pagos</span>
          <span className="rounded-full bg-white/12 px-3 py-2 backdrop-blur-md">Perfil</span>
        </div>
      </section>
    </div>
  </main>
);
