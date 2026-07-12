import { GenericModulePage } from "@/components/crud/GenericModulePage";
import type { TableQueryInput } from "@/lib/table-server";

export default async function CancelacionesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  return (
    <GenericModulePage
      title="Cancelaciones"
      description="Solicitudes y registros de cancelación."
      module="cancelaciones"
      table="cancelaciones"
      searchParams={await searchParams}
    />
  );
}
