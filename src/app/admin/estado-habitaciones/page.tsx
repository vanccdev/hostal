import { GenericModulePage } from "@/components/crud/GenericModulePage";
import type { TableQueryInput } from "@/lib/table-server";

export default async function EstadoHabitacionesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  return (
    <GenericModulePage
      title="Estado de habitaciones"
      description="Actualización y seguimiento operativo de habitaciones."
      module="estado-habitaciones"
      table="estado_habitaciones"
      searchParams={await searchParams}
    />
  );
}
