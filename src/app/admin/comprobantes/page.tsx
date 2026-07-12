import { GenericModulePage } from "@/components/crud/GenericModulePage";
import type { TableQueryInput } from "@/lib/table-server";

export default async function ComprobantesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  return (
    <GenericModulePage
      title="Comprobantes"
      description="Comprobantes de pago asociados a reservas."
      module="comprobantes"
      table="comprobantes"
      searchParams={await searchParams}
    />
  );
}
