import { GenericModulePage } from "@/components/crud/GenericModulePage";

export default function NotificacionesAdminPage() {
  return (
    <GenericModulePage
      title="Notificaciones"
      description="Notificaciones internas generadas por eventos."
      module="notificaciones"
      table="notificaciones"
    />
  );
}

