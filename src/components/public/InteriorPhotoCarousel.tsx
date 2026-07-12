"use client";

import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

type Photo = {
  src: string;
  title: string;
  description: string;
};

type InteriorPhotoCarouselProps = {
  photos: Photo[];
};

export const InteriorPhotoCarousel = ({ photos }: InteriorPhotoCarouselProps) => (
  <Carousel
    opts={{
      align: "start",
      loop: true,
    }}
    plugins={[
      Autoplay({
        delay: 2800,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]}
    className="px-10"
  >
    <CarouselContent className="-ml-4">
      {photos.map((photo) => (
        <CarouselItem key={photo.src} className="pl-4 md:basis-1/2 lg:basis-1/3">
          <article className="group overflow-hidden rounded-2xl border border-[#d8d4c8] bg-white dark:border-[#314237] dark:bg-[#18251d]">
            <div className="relative aspect-square bg-[#ece4d4] dark:bg-[#1d2c23]">
              <Image
                src={photo.src}
                alt={`${photo.title}: ${photo.description}`}
                fill
                sizes="(min-width: 1024px) 25vw, 80vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </div>
            <div className="space-y-1.5 p-4">
              <h3 className="font-semibold text-[#18221b] dark:text-zinc-100">{photo.title}</h3>
              <p className="text-sm leading-5 text-[#66736a] dark:text-[#b7c0b4]">{photo.description}</p>
            </div>
          </article>
        </CarouselItem>
      ))}
    </CarouselContent>
    <CarouselPrevious className="left-0 h-10 w-10 rounded-full" />
    <CarouselNext className="right-0 h-10 w-10 rounded-full" />
  </Carousel>
);
