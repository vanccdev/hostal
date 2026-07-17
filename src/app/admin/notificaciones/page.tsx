import { GenericModulePage } from "@/components/crud/GenericModulePage";
import { RealtimeNotificationsRefresh } from "@/components/admin/RealtimeNotificationsRefresh";
import type { TableQueryInput } from "@/lib/table-server";

export default async function NotificacionesAdminPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  return (
    <>
      <RealtimeNotificationsRefresh />
      <GenericModulePage
        title="Notificaciones"
        description="Notificaciones internas generadas por eventos."
        module="notificaciones"
        table="notificaciones"
        searchParams={await searchParams}
      />
    </>
  );
}
