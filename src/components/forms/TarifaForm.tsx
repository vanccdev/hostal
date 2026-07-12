"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { upsertTarifaAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
import { DatePickerField } from "@/components/forms/DatePickerField";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localISODate } from "@/lib/datetime";
import { tarifaSchema } from "@/schemas/crud";
import type { Tarifa } from "@/types/database";

type TarifaFormProps = {
  tarifa?: Tarifa;
};

export const TarifaForm = ({ tarifa }: TarifaFormProps) => {
  const [state, action, pending] = useActionState(upsertTarifaAction, initialActionState);
  const form = useForm<z.input<typeof tarifaSchema>>({
    resolver: zodResolver(tarifaSchema),
    defaultValues: {
      id: tarifa?.id,
      habitacionTipo: (tarifa?.habitacion_tipo as z.input<typeof tarifaSchema>["habitacionTipo"]) ?? "individual",
      temporada: (tarifa?.temporada as z.input<typeof tarifaSchema>["temporada"]) ?? "normal",
      precioNoche: tarifa?.precio_noche ?? 0,
      vigenteDesde: tarifa?.vigente_desde ?? localISODate(),
      vigenteHasta: tarifa?.vigente_hasta ?? "",
      activa: tarifa?.activa ?? true,
    },
  });

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      {tarifa ? <input type="hidden" value={tarifa.id} {...form.register("id")} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="habitacionTipo">Tipo de habitación</Label>
          <Select name="habitacionTipo" defaultValue={tarifa?.habitacion_tipo ?? "individual"}>
            <SelectTrigger id="habitacionTipo">
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
          <FormMessage state={state} field="habitacionTipo" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="temporada">Temporada</Label>
          <Select name="temporada" defaultValue={tarifa?.temporada ?? "normal"}>
            <SelectTrigger id="temporada">
              <SelectValue placeholder="Seleccionar temporada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="precioNoche">Precio por noche</Label>
          <Input id="precioNoche" type="number" min="0" step="0.01" {...form.register("precioNoche")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vigenteDesde">Vigente desde</Label>
          <DatePickerField
            id="vigenteDesde"
            name="vigenteDesde"
            defaultValue={tarifa?.vigente_desde ?? localISODate()}
            placeholder="Seleccionar inicio"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vigenteHasta">Vigente hasta</Label>
          <DatePickerField
            id="vigenteHasta"
            name="vigenteHasta"
            defaultValue={tarifa?.vigente_hasta ?? ""}
            placeholder="Sin fecha final"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("activa")} defaultChecked={tarifa?.activa ?? true} />
        Activa
      </label>
      <FormMessage state={state} />
      {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        <Save className="h-4 w-4" aria-hidden="true" />
        {tarifa ? "Actualizar tarifa" : "Guardar tarifa"}
      </Button>
    </form>
  );
};
