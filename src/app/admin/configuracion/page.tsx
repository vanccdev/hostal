import { GenericModulePage } from "@/components/crud/GenericModulePage";
import type { TableQueryInput } from "@/lib/table-server";

export default async function ConfiguracionPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  return (
    <GenericModulePage
      title="Configuración"
      description="Configuración crítica del hostal, solo admin."
      module="configuracion"
      table="configuracion_hostal"
      searchParams={await searchParams}
    />
  );
}
