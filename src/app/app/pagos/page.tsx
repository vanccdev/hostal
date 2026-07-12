import { ClientGenericPage } from "@/components/crud/ClientGenericPage";
import type { TableQueryInput } from "@/lib/table-server";

export default async function PagosPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  return (
    <ClientGenericPage
      title="Pagos"
      description="Pagos asociados a tus reservas."
      table="transacciones"
      filterBy="huesped_id"
      searchParams={await searchParams}
    />
  );
}
