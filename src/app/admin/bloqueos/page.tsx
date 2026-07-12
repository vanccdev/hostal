import { GenericModulePage } from "@/components/crud/GenericModulePage";
import type { TableQueryInput } from "@/lib/table-server";

export default async function BloqueosPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  return (
    <GenericModulePage
      title="Bloqueos de fechas"
      description="Fechas no reservables por habitación."
      module="bloqueos"
      table="bloqueos_fechas"
      searchParams={await searchParams}
    />
  );
}
