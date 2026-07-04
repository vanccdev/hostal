import { ClientGenericPage } from "@/components/crud/ClientGenericPage";

export default function NotificacionesPage() {
  return (
    <ClientGenericPage
      title="Notificaciones"
      description="Notificaciones internas de tu cuenta."
      table="notificaciones"
      filterBy="usuario_id"
    />
  );
}

