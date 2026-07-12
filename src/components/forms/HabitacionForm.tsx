"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { BedDouble, ImageUp, Tag } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { upsertHabitacionAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
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
};

export const HabitacionForm = ({ habitacion, tarifas }: HabitacionFormProps) => {
  const [state, action, pending] = useActionState(upsertHabitacionAction, initialActionState);
  const [activa, setActiva] = useState(habitacion?.activa ?? true);
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

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      {habitacion ? <input type="hidden" value={habitacion.id} {...form.register("id")} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" {...form.register("numero")} />
          <FormMessage state={state} field="numero" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Select name="tipo" defaultValue={habitacion?.tipo ?? "individual"}>
            <SelectTrigger id="tipo">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="matrimonial">Matrimonial</SelectItem>
              <SelectItem value="doble">Doble</SelectItem>
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
            <Select name="tarifaId" defaultValue={habitacion?.tarifa_id ?? undefined}>
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
            <div className="rounded-2xl border border-[#dddddd] bg-[#f7f7f7] p-4 dark:border-[#3a3a3a] dark:bg-[#242424]">
              <p className="text-sm font-medium text-[#717171] dark:text-[#b0b0b0]">
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="imagenes">Imágenes</Label>
          <Input id="imagenes" name="imagenes" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple />
          <p className="text-xs font-medium text-[#717171] dark:text-[#b0b0b0]">JPG, PNG, WEBP o GIF. Máximo 5 MB por imagen.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#dddddd] bg-white p-3 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
          <input type="hidden" name="activa" value={activa ? "true" : "false"} />
          <div className="space-y-1">
            <Label htmlFor="activa">Estado de la habitación</Label>
            <p className="text-xs font-medium text-[#717171] dark:text-[#b0b0b0]">
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
      <FormMessage state={state} />
      {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
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
