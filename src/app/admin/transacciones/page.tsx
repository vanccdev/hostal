import { GenericModulePage } from "@/components/crud/GenericModulePage";
import type { TableQueryInput } from "@/lib/table-server";

export default async function TransaccionesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  return (
    <GenericModulePage
      title="Transacciones"
      description="Gestión inicial de pagos y movimientos."
      module="transacciones"
      table="transacciones"
      searchParams={await searchParams}
    />
  );
}
