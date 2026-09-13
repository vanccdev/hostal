"use client";

import { useState } from "react";
import { ResponsiveDateRangePickerField } from "@/components/forms/ResponsiveDateRangePickerField";

export const DateRangePickerDemo = () => {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-[#d8d4c8] bg-white p-6 shadow-sm dark:border-[#314237] dark:bg-[#18251d]">
      <div>
        <h1 className="text-xl font-semibold">Prueba de selector de rango</h1>
        <p className="text-sm text-muted-foreground">Selecciona inicio y fin dentro del mismo calendario.</p>
      </div>
      <ResponsiveDateRangePickerField
        startId="demoFechaInicio"
        endId="demoFechaFin"
        startName="demoFechaInicio"
        endName="demoFechaFin"
        startValue={fechaInicio}
        endValue={fechaFin}
        disablePast
        placeholder="Seleccionar rango de fechas"
        onChange={({ from, to }) => {
          setFechaInicio(from);
          setFechaFin(to);
        }}
      />
      <div className="rounded-xl bg-[#f6f1e6] p-4 text-sm dark:bg-[#1d2c23]">
        <p><span className="font-semibold">Fecha de inicio:</span> {fechaInicio || "No seleccionada"}</p>
        <p><span className="font-semibold">Fecha de fin:</span> {fechaFin || "No seleccionada"}</p>
      </div>
    </div>
  );
};
