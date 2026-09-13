"use client";

import { useActionState, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { upsertTarifaAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { ResponsiveDateRangePickerField } from "@/components/forms/ResponsiveDateRangePickerField";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { localISODate } from "@/lib/datetime";
import { tarifaSchema } from "@/schemas/crud";
import type { Tarifa } from "@/types/database";

type TarifaFormProps = {
  tarifa?: Tarifa;
  onSuccess?: () => void;
};

export const TarifaForm = ({ tarifa, onSuccess }: TarifaFormProps) => {
  const [state, action, pending] = useActionState(upsertTarifaAction, initialActionState);
  const [activa, setActiva] = useState(tarifa?.activa ?? true);
  const [vigenteDesde, setVigenteDesde] = useState(tarifa?.vigente_desde ?? localISODate());
  const [vigenteHasta, setVigenteHasta] = useState(tarifa?.vigente_hasta ?? "");
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
      <ActionToast
        state={state}
        successTitle={tarifa ? "Tarifa actualizada" : "Tarifa creada"}
        errorTitle="No se pudo guardar la tarifa"
        onSuccess={onSuccess}
      />
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
              <SelectItem value="individual doble">Individual doble</SelectItem>
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
          <Label>Vigencia</Label>
          <ResponsiveDateRangePickerField
            startId="vigenteDesde"
            endId="vigenteHasta"
            startName="vigenteDesde"
            endName="vigenteHasta"
            startValue={vigenteDesde}
            endValue={vigenteHasta}
            onChange={({ from, to }) => {
              setVigenteDesde(from);
              setVigenteHasta(to);
            }}
            placeholder="Seleccionar vigencia"
            required
          />
          <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">Estas fechas quedan como información de la tarifa; la habitación conserva su tarifa asociada hasta un cambio manual.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#d8d4c8] bg-white p-3 dark:border-[#314237] dark:bg-[#18251d]">
          <input type="hidden" name="activa" value={activa ? "true" : "false"} />
          <div className="space-y-1">
            <Label htmlFor="activa">Estado de la tarifa</Label>
            <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
              {activa ? "Activa para asignar." : "Inactiva para nuevas asignaciones."}
            </p>
          </div>
          <Switch
            id="activa"
            checked={activa}
            onCheckedChange={(checked) => {
              setActiva(checked);
              form.setValue("activa", checked, { shouldDirty: true, shouldValidate: true });
            }}
            aria-label="Cambiar estado activo de la tarifa"
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        <Save className="h-4 w-4" aria-hidden="true" />
        {tarifa ? "Actualizar tarifa" : "Guardar tarifa"}
      </Button>
    </form>
  );
};
