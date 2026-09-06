import { appTimestampToMs } from "@/lib/datetime";
import type { StaySettings } from "@/lib/stay-settings";
import type { PoliticaCancelacion } from "@/types/database";

type CancellationPolicyInput = {
  paidAmount: number;
  checkinAt: string | null;
  fallbackDate: string;
  settings: Pick<
    StaySettings,
    "checkinTime" | "cancellationPartialRefundHours" | "cancellationNoRefundHours" | "cancellationPartialRefundPercent"
  >;
  now?: Date;
};

export type CancellationPolicyResult = {
  policy: PoliticaCancelacion;
  hoursBeforeStay: number;
  refundAmount: number;
  retainedAmount: number;
  retentionPercentApplied: number;
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
  const cutoffTime = checkinTime - settings.cancellationPartialRefundHours * 3_600_000;
  const hoursUntilCheckin = (checkinTime - now.getTime()) / 3_600_000;
  const hoursBeforeStay = Math.max(0, Math.floor(hoursUntilCheckin));

  if (safePaidAmount <= 0) {
    return {
      policy: "sin_reembolso",
      hoursBeforeStay,
      refundAmount: 0,
      retainedAmount: 0,
      retentionPercentApplied: 0,
      cutoffAt: new Date(cutoffTime),
      checkinAt: new Date(checkinTime),
    };
  }

  if (hoursUntilCheckin > settings.cancellationPartialRefundHours) {
    const refundAmount = money(safePaidAmount * (settings.cancellationPartialRefundPercent / 100));
    const retainedAmount = money(safePaidAmount - refundAmount);

    return {
      policy: "reembolso_parcial",
      hoursBeforeStay,
      refundAmount,
      retainedAmount,
      retentionPercentApplied: 100 - settings.cancellationPartialRefundPercent,
      cutoffAt: new Date(cutoffTime),
      checkinAt: new Date(checkinTime),
    };
  }

  return {
    policy: "sin_reembolso",
    hoursBeforeStay,
    refundAmount: 0,
    retainedAmount: money(safePaidAmount),
    retentionPercentApplied: 100,
    cutoffAt: new Date(cutoffTime),
    checkinAt: new Date(checkinTime),
  };
};

export const cancellationPolicyText = (settings: Pick<StaySettings, "checkinTime" | "cancellationPartialRefundHours" | "cancellationNoRefundHours" | "cancellationPartialRefundPercent">) =>
  `Más de ${settings.cancellationPartialRefundHours} horas antes del check-in: reembolso del ${settings.cancellationPartialRefundPercent}% del importe pagado. Entre ${settings.cancellationPartialRefundHours} y ${settings.cancellationNoRefundHours} horas antes: sin reembolso. Menos de ${settings.cancellationNoRefundHours} horas antes o no presentación: sin reembolso.`;
