import { appTimestampToMs } from "@/lib/datetime";
import type { StaySettings } from "@/lib/stay-settings";
import type { PoliticaCancelacion } from "@/types/database";

type CancellationPolicyInput = {
  paidAmount: number;
  checkinAt: string | null;
  fallbackDate: string;
  settings: Pick<StaySettings, "checkinTime" | "cancellationRefundHours" | "cancellationRetentionPercent">;
  now?: Date;
};

export type CancellationPolicyResult = {
  policy: PoliticaCancelacion;
  hoursBeforeStay: number;
  refundAmount: number;
  retainedAmount: number;
  cutoffAt: Date;
  checkinAt: Date;
};

const money = (value: number) => Math.round(value * 100) / 100;

const timestampToMs = (value: string) => {
  const parsed = appTimestampToMs(value);

  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  return new Date(value).getTime();
};

export const calculateCancellationPolicy = ({
  paidAmount,
  checkinAt,
  fallbackDate,
  settings,
  now = new Date(),
}: CancellationPolicyInput): CancellationPolicyResult => {
  const safePaidAmount = Math.max(0, Number(paidAmount) || 0);
  const checkinTime = checkinAt
    ? timestampToMs(checkinAt)
    : timestampToMs(`${fallbackDate}T${settings.checkinTime}:00`);
  const cutoffTime = checkinTime - settings.cancellationRefundHours * 3_600_000;
  const hoursBeforeStay = Math.max(0, Math.floor((checkinTime - now.getTime()) / 3_600_000));

  if (safePaidAmount <= 0) {
    return {
      policy: "sin_reembolso",
      hoursBeforeStay,
      refundAmount: 0,
      retainedAmount: 0,
      cutoffAt: new Date(cutoffTime),
      checkinAt: new Date(checkinTime),
    };
  }

  if (now.getTime() <= cutoffTime) {
    return {
      policy: "reembolso_total",
      hoursBeforeStay,
      refundAmount: money(safePaidAmount),
      retainedAmount: 0,
      cutoffAt: new Date(cutoffTime),
      checkinAt: new Date(checkinTime),
    };
  }

  const retainedAmount = money(safePaidAmount * (settings.cancellationRetentionPercent / 100));
  const refundAmount = money(Math.max(0, safePaidAmount - retainedAmount));

  return {
    policy: refundAmount > 0 ? "reembolso_parcial" : "sin_reembolso",
    hoursBeforeStay,
    refundAmount,
    retainedAmount,
    cutoffAt: new Date(cutoffTime),
    checkinAt: new Date(checkinTime),
  };
};

export const cancellationPolicyText = (settings: Pick<StaySettings, "checkinTime" | "cancellationRefundHours" | "cancellationRetentionPercent">) =>
  `Cancelación hasta ${settings.cancellationRefundHours} horas antes del check-in programado: reembolso total. Después de ese límite el sistema registra como monto final del hostal el ${settings.cancellationRetentionPercent}% del monto pagado.`;
