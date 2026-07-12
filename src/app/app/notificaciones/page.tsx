import { ClientGenericPage } from "@/components/crud/ClientGenericPage";
import type { TableQueryInput } from "@/lib/table-server";

export default async function NotificacionesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  return (
    <ClientGenericPage
      title="Notificaciones"
      description="Notificaciones internas de tu cuenta."
      table="notificaciones"
      filterBy="usuario_id"
      searchParams={await searchParams}
    />
  );
}
