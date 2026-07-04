import { ClientGenericPage } from "@/components/crud/ClientGenericPage";

export default function CancelacionesPage() {
  return (
    <ClientGenericPage
      title="Cancelaciones"
      description="Solicitudes y registros de cancelación propios."
      table="cancelaciones"
      filterBy="huesped_id"
    />
  );
}

