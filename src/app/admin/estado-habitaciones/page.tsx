import { GenericModulePage } from "@/components/crud/GenericModulePage";

export default function EstadoHabitacionesPage() {
  return (
    <GenericModulePage
      title="Estado de habitaciones"
      description="Actualización y seguimiento operativo de habitaciones."
      module="estado-habitaciones"
      table="estado_habitaciones"
    />
  );
}

