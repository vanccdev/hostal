import { ClientGenericPage } from "@/components/crud/ClientGenericPage";
import type { TableQueryInput } from "@/lib/table-server";

export default async function CancelacionesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  return (
    <ClientGenericPage
      title="Cancelaciones"
      description="Solicitudes y registros de cancelación propios."
      table="cancelaciones"
      filterBy="huesped_id"
      searchParams={await searchParams}
    />
  );
}
