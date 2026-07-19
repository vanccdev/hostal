"use client";

import { useActionState, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, Save } from "lucide-react";
import { type UseFormReturn, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import type { ActionState } from "@/app/actions/types";
import { updateStaySettingsAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_TIME_ZONE } from "@/lib/datetime";
import {
  calculateTurnoverMinutes,
  cancellationPolicyText,
  hasValidStaySchedule,
  stayPolicyText,
  type StaySettings,
} from "@/lib/stay-settings";
import { staySettingsSchema } from "@/schemas/crud";

type StaySettingsFormProps = {
  settings: StaySettings;
};

type StaySettingsFormInput = z.input<typeof staySettingsSchema>;
type TimeFieldName = "checkinTime" | "checkoutTime";

const hourOptions = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);

export const StaySettingsForm = ({ settings }: StaySettingsFormProps) => {
  const [state, action, pending] = useActionState(updateStaySettingsAction, initialActionState);
  const form = useForm<StaySettingsFormInput>({
    resolver: zodResolver(staySettingsSchema),
    defaultValues: {
      checkinTime: settings.checkinTime,
      checkoutTime: settings.checkoutTime,
      paymentProofTimeoutMinutes: settings.paymentProofTimeoutMinutes,
      cancellationRefundHours: settings.cancellationRefundHours,
      cancellationRetentionPercent: settings.cancellationRetentionPercent,
    },
  });
  const [checkinTime, setCheckinTime] = useState(settings.checkinTime);
  const [checkoutTime, setCheckoutTime] = useState(settings.checkoutTime);
  const cancellationRefundHours = useWatch({ control: form.control, name: "cancellationRefundHours" });
  const cancellationRetentionPercent = useWatch({ control: form.control, name: "cancellationRetentionPercent" });
  const turnoverMinutes = calculateTurnoverMinutes(checkoutTime, checkinTime);
  const validSchedule = hasValidStaySchedule(checkoutTime, checkinTime);
  const previewSettings = {
    ...settings,
    checkinTime,
    checkoutTime,
    cancellationRefundHours: Number(cancellationRefundHours),
    cancellationRetentionPercent: Number(cancellationRetentionPercent),
  };

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      <ActionToast
        state={state}
        successTitle="Configuración guardada"
        errorTitle="No se pudo guardar la configuración"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TimeHourSelect
          form={form}
          state={state}
          name="checkinTime"
          label="Check-in desde"
          value={checkinTime}
          onChange={setCheckinTime}
        />
        <TimeHourSelect
          form={form}
          state={state}
          name="checkoutTime"
          label="Check-out hasta"
          value={checkoutTime}
          onChange={setCheckoutTime}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentProofTimeoutMinutes">Espera de comprobante en minutos</Label>
        <Input
          id="paymentProofTimeoutMinutes"
          type="number"
          min={0}
          max={10080}
          step={1}
          {...form.register("paymentProofTimeoutMinutes")}
          name="paymentProofTimeoutMinutes"
        />
        <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
          Usa 0 para desactivar la cancelación automática. El job cancela reservas pendientes de pago sin comprobante al pasar este tiempo.
        </p>
        <FormMessage state={state} field="paymentProofTimeoutMinutes" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cancellationRefundHours">Anticipación para reembolso en horas</Label>
          <Input
            id="cancellationRefundHours"
            type="number"
            min={0}
            max={8760}
            step={1}
            {...form.register("cancellationRefundHours")}
            name="cancellationRefundHours"
          />
          <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
            Se calcula hacia atrás desde el check-in programado. Si el check-in es 13:00 y configuras 12 horas, el corte es 01:00.
          </p>
          <FormMessage state={state} field="cancellationRefundHours" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cancellationRetentionPercent">Retención por cancelación (%)</Label>
          <Input
            id="cancellationRetentionPercent"
            type="number"
            min={0}
            max={100}
            step={1}
            {...form.register("cancellationRetentionPercent")}
            name="cancellationRetentionPercent"
          />
          <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
            Porcentaje retenido cuando el huésped cancela después del corte de reembolso total.
          </p>
          <FormMessage state={state} field="cancellationRetentionPercent" />
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-xl bg-[#f4ecd8] p-3 text-sm text-[#6d5728] dark:bg-[#2b2618] dark:text-[#e8d59a]">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {validSchedule ? (
          <p>
            {stayPolicyText({ ...settings, checkinTime, checkoutTime })} La zona horaria es {APP_TIME_ZONE} y la ventana
            de preparación se calcula automáticamente en {turnoverMinutes} minutos.
          </p>
        ) : (
          <p>El check-in debe ser posterior al check-out por al menos 1 minuto.</p>
        )}
      </div>
      <div className="rounded-xl border border-[#d8d4c8] bg-white p-3 text-sm text-[#18221b] dark:border-[#314237] dark:bg-[#18251d] dark:text-zinc-100">
        <p className="font-semibold">Política de cancelación</p>
        <p className="mt-1 text-[#66736a] dark:text-[#b7c0b4]">{cancellationPolicyText(previewSettings)}</p>
      </div>
      <Button type="submit" disabled={pending || !validSchedule}>
        <Save className="h-4 w-4" aria-hidden="true" />
        Guardar reglas de estadía
      </Button>
    </form>
  );
};

const TimeHourSelect = ({
  form,
  state,
  name,
  label,
  value,
  onChange,
}: {
  form: UseFormReturn<StaySettingsFormInput>;
  state: ActionState;
  name: TimeFieldName;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <input type="hidden" name={name} value={value} readOnly />
    <Select
      value={value}
      onValueChange={(value) => {
        onChange(value);
        form.setValue(name, value, { shouldDirty: true, shouldValidate: true });
      }}
    >
      <SelectTrigger id={name}>
        <SelectValue placeholder="Selecciona una hora" />
      </SelectTrigger>
      <SelectContent>
        {hourOptions.map((hour) => (
          <SelectItem key={hour} value={hour}>
            {hour}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <FormMessage state={state} field={name} />
  </div>
);
