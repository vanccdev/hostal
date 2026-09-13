"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, startTransition, useActionState, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { BedDouble, ImageUp, Tag } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { upsertHabitacionAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { HabitacionImageDeleteButton } from "@/components/forms/HabitacionImageDeleteButton";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { habitacionSchema } from "@/schemas/crud";
import type { Habitacion, ImgHabitacion, Tarifa } from "@/types/database";

type HabitacionFormProps = {
  habitacion?: Habitacion;
  existingImages?: Pick<ImgHabitacion, "id" | "url">[];
  tarifas: Tarifa[];
  onSuccess?: () => void;
};

export const HabitacionForm = ({ habitacion, existingImages = [], tarifas, onSuccess }: HabitacionFormProps) => {
  const [state, action, pending] = useActionState(upsertHabitacionAction, initialActionState);
  const initialTipo = (habitacion?.tipo as z.input<typeof habitacionSchema>["tipo"]) ?? "individual";
  const [selectedTipo, setSelectedTipo] = useState<z.input<typeof habitacionSchema>["tipo"]>(initialTipo);
  const [selectedTarifaId, setSelectedTarifaId] = useState(habitacion?.tarifa_id ?? "");
  const [activa, setActiva] = useState(habitacion?.activa ?? true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUploadResetKey, setImageUploadResetKey] = useState(0);
  const [deletedExistingImageIds, setDeletedExistingImageIds] = useState<string[]>([]);
  const form = useForm<z.input<typeof habitacionSchema>>({
    resolver: zodResolver(habitacionSchema),
    defaultValues: {
      id: habitacion?.id,
      tarifaId: habitacion?.tarifa_id ?? undefined,
      numero: habitacion?.numero ?? "",
      tipo: (habitacion?.tipo as z.input<typeof habitacionSchema>["tipo"]) ?? "individual",
      piso: habitacion?.piso ?? 1,
      capacidadMax: habitacion?.capacidad_max ?? 1,
      descripcion: habitacion?.descripcion ?? "",
      activa: habitacion?.activa ?? true,
    },
  });
  const hasTarifas = tarifas.length > 0;
  const visibleExistingImages = existingImages.filter((image) => !deletedExistingImageIds.includes(image.id));
  const existingImageCount = visibleExistingImages.length;

  const handleExistingImageDeleted = (imageId: string) => {
    setDeletedExistingImageIds((currentIds) => [...currentIds, imageId]);
  };

  const handleSuccess = () => {
    setImageFiles([]);
    setImageUploadResetKey((key) => key + 1);
    onSuccess?.();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;

    const isValid = await form.trigger();
    if (!isValid) {
      return;
    }

    const formData = new FormData(formElement);
    for (const file of imageFiles) {
      formData.append("imagenes", file);
    }

    startTransition(() => {
      action(formData);
    });
  };

  return (
    <form action={action} className="space-y-4" onSubmit={handleSubmit}>
      <ActionToast
        state={state}
        successTitle={habitacion ? "Habitación actualizada" : "Habitación creada"}
        errorTitle="No se pudo guardar la habitación"
        onSuccess={handleSuccess}
      />
      {habitacion ? <input type="hidden" value={habitacion.id} {...form.register("id")} /> : null}
      <div className="flex w-full min-w-0 flex-col items-stretch gap-6 md:flex-row">
        <div className="flex w-full min-w-0 flex-none flex-wrap gap-4 md:flex-1 md:basis-0">
        <div className="min-w-0 flex-1 basis-full space-y-2 sm:basis-[calc(50%-0.5rem)]">
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" {...form.register("numero")} />
          <FormMessage state={state} field="numero" />
        </div>
        <div className="min-w-0 flex-1 basis-full space-y-2 sm:basis-[calc(50%-0.5rem)]">
          <Label htmlFor="tipo">Tipo</Label>
          <Select
            name="tipo"
            value={selectedTipo}
            onValueChange={(value) => {
              const nextTipo = value as z.input<typeof habitacionSchema>["tipo"];
              setSelectedTipo(nextTipo);
              form.setValue("tipo", nextTipo, { shouldDirty: true, shouldValidate: true });
            }}
          >
            <SelectTrigger id="tipo">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="matrimonial">Matrimonial</SelectItem>
              <SelectItem value="individual doble">Individual doble</SelectItem>
              <SelectItem value="triple">Triple</SelectItem>
              <SelectItem value="familiar">Familiar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 flex-1 basis-full space-y-2 sm:basis-[calc(50%-0.5rem)]">
          <Label htmlFor="piso">Piso</Label>
          <Input id="piso" type="number" min="1" {...form.register("piso")} />
        </div>
        <div className="min-w-0 flex-1 basis-full space-y-2 sm:basis-[calc(50%-0.5rem)]">
          <Label htmlFor="capacidadMax">Capacidad máxima</Label>
          <Input id="capacidadMax" type="number" min="1" {...form.register("capacidadMax")} />
        </div>
        <div className="min-w-0 basis-full space-y-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea id="descripcion" {...form.register("descripcion")} />
        </div>
        <div className="min-w-0 basis-full space-y-2">
          <Label htmlFor="tarifaId">Tarifa asociada</Label>
          {hasTarifas ? (
            <Select
              name="tarifaId"
              value={selectedTarifaId || undefined}
              onValueChange={(value) => {
                setSelectedTarifaId(value);
                form.setValue("tarifaId", value, { shouldDirty: true, shouldValidate: true });
              }}
            >
              <SelectTrigger id="tarifaId">
                <SelectValue placeholder="Seleccionar tarifa" />
              </SelectTrigger>
              <SelectContent>
                {tarifas.map((availableTarifa) => (
                  <SelectItem key={availableTarifa.id} value={availableTarifa.id}>
                    {availableTarifa.habitacion_tipo} / {availableTarifa.temporada} - {availableTarifa.precio_noche}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="rounded-2xl border border-[#d8d4c8] bg-[#f6f1e6] p-4 dark:border-[#314237] dark:bg-[#1d2c23]">
              <p className="text-sm font-medium text-[#66736a] dark:text-[#b7c0b4]">
                Primero crea una tarifa para poder asociarla a la habitación.
              </p>
              <Button asChild variant="outline" className="mt-3">
                <Link href="/admin/tarifas">
                  <Tag className="h-4 w-4" aria-hidden="true" />
                  Ir a tarifas
                </Link>
              </Button>
            </div>
          )}
          <FormMessage state={state} field="tarifaId" />
        </div>
        <div className="flex basis-full items-center justify-between gap-4 rounded-xl border border-[#d8d4c8] bg-white p-3 dark:border-[#314237] dark:bg-[#18251d]">
          <input type="hidden" name="activa" value={activa ? "true" : "false"} />
          <div className="space-y-1">
            <Label htmlFor="activa">Estado de la habitación</Label>
            <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
              {activa ? "Activa para reservas." : "Inactiva para nuevas reservas."}
            </p>
          </div>
          <Switch
            id="activa"
            checked={activa}
            onCheckedChange={(checked) => {
              setActiva(checked);
              form.setValue("activa", checked, { shouldDirty: true, shouldValidate: true });
            }}
            aria-label="Cambiar estado activo de la habitación"
          />
        </div>
        </div>
        <div
          className="flex w-full min-w-0 flex-none flex-col gap-2 overflow-hidden md:flex-1 md:basis-0"
        >
          <Label>Imágenes</Label>
          {existingImageCount > 0 ? (
            <div className="w-full min-w-0 max-w-full space-y-3 overflow-hidden rounded-xl border border-[#d8d4c8] bg-white p-3 dark:border-[#314237] dark:bg-[#18251d]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#18221b] dark:text-zinc-100">Imágenes actuales</p>
                <span className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
                  {existingImageCount} foto{existingImageCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex w-full min-w-0 max-w-full flex-wrap gap-3">
                {visibleExistingImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative w-full min-w-0 max-w-full flex-1 basis-full overflow-hidden rounded-xl border border-[#d8d4c8] bg-[#f6f1e6] dark:border-[#314237] dark:bg-[#1d2c23] sm:basis-[calc(50%-0.75rem)]"
                  >
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={image.url}
                        alt={`Imagen actual ${index + 1} de habitación ${habitacion?.numero ?? ""}`}
                        fill
                        sizes="100vw"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <HabitacionImageDeleteButton imageId={image.id} onDeleted={handleExistingImageDeleted} />
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
                Al seleccionar nuevas imágenes se agregarán a la galería existente.
              </p>
            </div>
          ) : habitacion ? (
            <div className="rounded-xl border border-[#d8d4c8] bg-white p-3 text-sm font-medium text-[#66736a] dark:border-[#314237] dark:bg-[#18251d] dark:text-[#b7c0b4]">
              Esta habitación no tiene imágenes cargadas.
            </div>
          ) : null}
          <ImageUpload
            resetKey={imageUploadResetKey}
            onFilesChange={(files) => setImageFiles(files.map(({ file }) => file))}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending || !hasTarifas}>
        {pending ? (
          <ImageUp className="h-4 w-4" aria-hidden="true" />
        ) : (
          <BedDouble className="h-4 w-4" aria-hidden="true" />
        )}
        {habitacion ? "Actualizar habitación" : "Guardar habitación"}
      </Button>
    </form>
  );
};
