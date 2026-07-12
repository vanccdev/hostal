import { ClientGenericPage } from "@/components/crud/ClientGenericPage";
import type { TableQueryInput } from "@/lib/table-server";

export default async function ComprobantesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  return (
    <ClientGenericPage
      title="Comprobantes"
      description="Comprobantes asociados a tus reservas."
      table="comprobantes"
      filterBy="huesped_id"
      searchParams={await searchParams}
    />
  );
}
