"use client";

import Image from "next/image";
import Link from "next/link";
import { type DragEvent, useActionState, useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { BedDouble, ImagePlus, ImageUp, Tag, X } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { upsertHabitacionAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { habitacionSchema } from "@/schemas/crud";
import type { Habitacion, Tarifa } from "@/types/database";

type HabitacionFormProps = {
  habitacion?: Habitacion;
  tarifas: Tarifa[];
  onSuccess?: () => void;
};

type ImagePreview = {
  id: string;
  file: File;
  name: string;
  url: string;
};

export const HabitacionForm = ({ habitacion, tarifas, onSuccess }: HabitacionFormProps) => {
  const [state, action, pending] = useActionState(upsertHabitacionAction, initialActionState);
  const initialTipo = (habitacion?.tipo as z.input<typeof habitacionSchema>["tipo"]) ?? "individual";
  const [selectedTipo, setSelectedTipo] = useState<z.input<typeof habitacionSchema>["tipo"]>(initialTipo);
  const [selectedTarifaId, setSelectedTarifaId] = useState(habitacion?.tarifa_id ?? "");
  const [activa, setActiva] = useState(habitacion?.activa ?? true);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imagePreviewsRef = useRef<ImagePreview[]>([]);
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
  const imageCount = imagePreviews.length;

  useEffect(() => {
    return () => {
      for (const preview of imagePreviewsRef.current) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, []);

  const setPreviewState = (nextPreviews: ImagePreview[]) => {
    imagePreviewsRef.current = nextPreviews;
    setImagePreviews(nextPreviews);
  };

  const syncFileInput = (files: File[]) => {
    if (!fileInputRef.current) {
      return;
    }

    const dataTransfer = new DataTransfer();

    for (const file of files) {
      dataTransfer.items.add(file);
    }

    fileInputRef.current.files = dataTransfer.files;
  };

  const replaceImageSelection = (files: File[]) => {
    for (const preview of imagePreviewsRef.current) {
      URL.revokeObjectURL(preview.url);
    }

    const selectedFiles = files.filter((file) => file.size > 0);
    const nextPreviews = selectedFiles.map((file, index) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
      file,
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    syncFileInput(selectedFiles);
    setPreviewState(nextPreviews);
  };

  const removeImagePreview = (id: string) => {
    const removedPreview = imagePreviewsRef.current.find((preview) => preview.id === id);
    const nextPreviews = imagePreviewsRef.current.filter((preview) => preview.id !== id);

    if (removedPreview) {
      URL.revokeObjectURL(removedPreview.url);
    }

    syncFileInput(nextPreviews.map((preview) => preview.file));
    setPreviewState(nextPreviews);
  };

  const clearImageInput = () => {
    for (const preview of imagePreviewsRef.current) {
      URL.revokeObjectURL(preview.url);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setPreviewState([]);
  };

  const handleSuccess = () => {
    clearImageInput();
    onSuccess?.();
  };

  const handleImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);

    if (files.length === 0) {
      return;
    }

    replaceImageSelection(files);
  };

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      <ActionToast
        state={state}
        successTitle={habitacion ? "Habitación actualizada" : "Habitación creada"}
        errorTitle="No se pudo guardar la habitación"
        onSuccess={handleSuccess}
      />
      {habitacion ? <input type="hidden" value={habitacion.id} {...form.register("id")} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" {...form.register("numero")} />
          <FormMessage state={state} field="numero" />
        </div>
        <div className="space-y-2">
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
        <div className="space-y-2">
          <Label htmlFor="piso">Piso</Label>
          <Input id="piso" type="number" min="1" {...form.register("piso")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacidadMax">Capacidad máxima</Label>
          <Input id="capacidadMax" type="number" min="1" {...form.register("capacidadMax")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea id="descripcion" {...form.register("descripcion")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
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
                    {availableTarifa.habitacion_tipo} / {availableTarifa.temporada} - {availableTarifa.precio_noche} · peso{" "}
                    {availableTarifa.peso}
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
        <div
          className="space-y-2 sm:col-span-2"
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={handleImageDrop}
        >
          <Label htmlFor="imagenes">Imágenes</Label>
          <label
            htmlFor="imagenes"
            className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#d8d4c8] bg-[#f6f1e6] px-4 py-6 text-center transition-colors hover:border-[#c7a35a] hover:bg-[#f4ecd8] dark:border-[#314237] dark:bg-[#1d2c23] dark:hover:border-[#e8d59a] dark:hover:bg-[#223229]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c7a35a] text-[#102317]">
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="space-y-1">
              <span className="block text-sm font-semibold text-[#18221b] dark:text-zinc-100">
                Arrastra imágenes aquí o haz clic para seleccionar
              </span>
              <span className="block text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
                {imageCount > 0 ? `${imageCount} imagen${imageCount === 1 ? "" : "es"} seleccionada${imageCount === 1 ? "" : "s"}` : "Puedes subir varias imágenes a la vez."}
              </span>
            </span>
          </label>
          <Input
            ref={fileInputRef}
            id="imagenes"
            name="imagenes"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            onChange={(event) => replaceImageSelection(Array.from(event.currentTarget.files ?? []))}
          />
          {imagePreviews.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {imagePreviews.map((preview, index) => (
                <div
                  key={`${preview.name}-${preview.url}`}
                  className="relative overflow-hidden rounded-xl border border-[#d8d4c8] bg-white dark:border-[#314237] dark:bg-[#18251d]"
                >
                  <div className="relative aspect-[4/3] bg-[#f6f1e6] dark:bg-[#1d2c23]">
                    <Image
                      src={preview.url}
                      alt={`Vista previa ${index + 1}: ${preview.name}`}
                      fill
                      sizes="(min-width: 1024px) 180px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="truncate px-3 py-2 text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
                    {preview.name}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-8 w-8 rounded-full bg-black/60 text-white hover:bg-black/75 hover:text-white"
                    onClick={() => removeImagePreview(preview.id)}
                    aria-label={`Quitar ${preview.name}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">JPG, PNG, WEBP o GIF. Máximo 5 MB por imagen.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#d8d4c8] bg-white p-3 dark:border-[#314237] dark:bg-[#18251d]">
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
