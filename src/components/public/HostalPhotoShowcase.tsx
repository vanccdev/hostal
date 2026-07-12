import Image from "next/image";
import { Camera, MapPin, Sparkles } from "lucide-react";
import { InteriorPhotoCarousel } from "@/components/public/InteriorPhotoCarousel";

const insidePhotos = [
  {
    src: "/dentro-hostal/amigas.jpg",
    title: "Café en el patio",
    description: "Un rincón exterior para conversar con calma entre plantas y detalles de piedra.",
  },
  {
    src: "/dentro-hostal/chimenea.jpg",
    title: "Sala con chimenea",
    description: "Un ambiente cálido para descansar, leer o conversar al final del día.",
  },
  {
    src: "/dentro-hostal/desayuno.jpg",
    title: "Desayunos servidos",
    description: "Café, jugos y platos preparados para empezar la mañana dentro del hostal.",
  },
  {
    src: "/dentro-hostal/desayuno2.jpg",
    title: "Desayuno en habitación",
    description: "Una mesa servida con pan, fruta, café y jugo para una mañana sin apuro.",
  },
  {
    src: "/dentro-hostal/comedor.jpg",
    title: "Comedor amplio",
    description: "Mesas cómodas para grupos, familias y viajeros que prefieren comer sin salir.",
  },
  {
    src: "/dentro-hostal/hatiacionpersona.jpg",
    title: "Habitaciones listas",
    description: "Espacios ordenados, con cama preparada, toallas y luz natural.",
  },
  {
    src: "/dentro-hostal/llegando al hostal.jpg",
    title: "Llegada al hostal",
    description: "Balcones, pasillos y vegetación acompañan el ingreso a las habitaciones.",
  },
  {
    src: "/dentro-hostal/vista2.jpg",
    title: "Patio interior",
    description: "Arquitectura tradicional, balcones y vegetación en un patio tranquilo.",
  },
  {
    src: "/dentro-hostal/mesavino.jpg",
    title: "Momentos especiales",
    description: "Detalles para compartir una copa o una cena tranquila en el hostal.",
  },
  {
    src: "/dentro-hostal/reunion1.jpg",
    title: "Reuniones privadas",
    description: "Mesas preparadas para encuentros, comidas familiares o reuniones pequeñas.",
  },
  {
    src: "/dentro-hostal/sillas.jpg",
    title: "Rincones de descanso",
    description: "Sillas de mimbre y un ambiente fresco para una pausa dentro del hostal.",
  },
];

const camargoPhotos = [
  {
    src: "/en-camargo/iglesia.jpg",
    title: "Iglesia de Santiago Apóstol",
    description: "Un punto clásico de Camargo para recorrer desde el centro.",
  },
  {
    src: "/en-camargo/pasarela.jpg",
    title: "Pasarela San Roque",
    description: "Paisaje de cerros rojizos y una caminata memorable cerca de la ciudad.",
  },
  {
    src: "/en-camargo/plaza.jpg",
    title: "Plaza 6 de Agosto",
    description: "El corazón urbano para pasear, ubicarse y disfrutar la vida local.",
  },
  {
    src: "/en-camargo/personas.jpg",
    title: "Tradición local",
    description: "Personas y trajes típicos muestran el color cultural de Camargo.",
  },
];

export const HostalPhotoShowcase = () => (
  <section className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div className="space-y-3">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#f4ecd8] px-3 py-1 text-sm font-semibold text-[#6d5728] dark:bg-[#2b2618] dark:text-[#e8d59a]">
          <Camera className="h-4 w-4" aria-hidden="true" />
          Conoce el hostal
        </p>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-normal text-[#18221b] dark:text-zinc-100">
            Espacios para descansar, compartir y descubrir Camargo.
          </h2>
          <p className="max-w-2xl text-base leading-7 text-[#66736a] dark:text-[#b7c0b4]">
            Más que una habitación: ambientes interiores con carácter, desayuno, patio y lugares cercanos para visitar durante tu estadía.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-[#d8d4c8] bg-white p-4 text-sm shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:border-[#314237] dark:bg-[#18251d]">
        <p className="flex items-center gap-2 font-semibold text-[#18221b] dark:text-zinc-100">
          <Sparkles className="h-4 w-4 text-[#c7a35a]" aria-hidden="true" />
          Interior + ciudad
        </p>
        <p className="mt-1 text-[#66736a] dark:text-[#b7c0b4]">Una vista rápida de lo que el huésped encuentra dentro y fuera.</p>
      </div>
    </div>

    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <article className="group grid h-full overflow-hidden rounded-2xl border border-[#d8d4c8] bg-white shadow-[0_10px_34px_rgba(0,0,0,0.10)] dark:border-[#314237] dark:bg-[#18251d] lg:grid-rows-[auto_1fr]">
        <div className="relative aspect-[16/10] bg-[#ece4d4] dark:bg-[#1d2c23]">
          <Image
            src="/dentro-hostal/vista1.jpg"
            alt="Vista desde el interior del Hostal Plaza hacia los cerros de Camargo"
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <div className="grid h-full gap-5 p-5 lg:grid-cols-[1fr_3fr]">
          <div className="flex flex-col justify-center space-y-2">
            <p className="text-sm font-semibold uppercase text-[#c7a35a]">Desde el hostal</p>
            <h3 className="text-2xl font-semibold text-[#18221b] dark:text-zinc-100">Vistas, patio y descanso con identidad local.</h3>
            <p className="text-sm leading-6 text-[#66736a] dark:text-[#b7c0b4]">
              El hostal combina detalles tradicionales, vegetación y vistas abiertas de Camargo para que la estadía se sienta cercana y tranquila.
            </p>
          </div>
          <div className="relative min-h-64 overflow-hidden rounded-xl bg-[#ece4d4] dark:bg-[#1d2c23] lg:min-h-full">
            <Image
              src="/dentro-hostal/llegando al hostal.jpg"
              alt="Llegada al Hostal Plaza con balcones, vegetación y pasillos interiores"
              fill
              sizes="(min-width: 1024px) 32vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </article>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
        {insidePhotos.slice(1, 3).map((photo) => (
          <PhotoCard key={photo.src} {...photo} priority />
        ))}
      </div>
    </div>

    <InteriorPhotoCarousel
      photos={[insidePhotos[0], ...insidePhotos.slice(3, 5), ...insidePhotos.slice(9)]}
    />

    <div className="space-y-4 rounded-2xl border border-[#d8d4c8] bg-white p-5 shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:border-[#314237] dark:bg-[#18251d]">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-[#c7a35a]" aria-hidden="true" />
        <div>
          <h3 className="text-xl font-semibold text-[#18221b] dark:text-zinc-100">Camargo alrededor del hostal</h3>
          <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Lugares para visitar y reconocer la ciudad durante tu estadía.</p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-4">
        {camargoPhotos.map((photo) => (
          <PhotoCard key={photo.src} {...photo} compact />
        ))}
      </div>
    </div>
  </section>
);

type PhotoCardProps = {
  src: string;
  title: string;
  description: string;
  compact?: boolean;
  priority?: boolean;
};

const PhotoCard = ({ src, title, description, compact, priority }: PhotoCardProps) => (
  <article className="group overflow-hidden rounded-2xl border border-[#d8d4c8] bg-white dark:border-[#314237] dark:bg-[#18251d]">
    <div className={`relative bg-[#ece4d4] dark:bg-[#1d2c23] ${compact ? "aspect-[4/3]" : "aspect-square"}`}>
      <Image
        src={src}
        alt={`${title}: ${description}`}
        fill
        sizes={compact ? "(min-width: 768px) 30vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        priority={priority}
      />
    </div>
    <div className="space-y-1.5 p-4">
      <h3 className="font-semibold text-[#18221b] dark:text-zinc-100">{title}</h3>
      <p className="text-sm leading-5 text-[#66736a] dark:text-[#b7c0b4]">{description}</p>
    </div>
  </article>
);
