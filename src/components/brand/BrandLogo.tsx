import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  showText?: boolean;
  text?: string;
};

export const BrandLogo = ({
  className,
  imageClassName,
  showText = true,
  text = "Hostal Plaza",
}: BrandLogoProps) => (
  <span className={cn("inline-flex items-center gap-2", className)}>
    <span className={cn("relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#153f2a]", imageClassName)}>
      <Image src="/icono.jpg" alt="Hostal Plaza Camargo" fill sizes="40px" className="object-cover" priority />
    </span>
    {showText ? <span className="font-semibold text-[#18221b] dark:text-zinc-100">{text}</span> : null}
  </span>
);
