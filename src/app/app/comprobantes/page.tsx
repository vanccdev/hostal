import { ClientGenericPage } from "@/components/crud/ClientGenericPage";

export default function ComprobantesPage() {
  return (
    <ClientGenericPage
      title="Comprobantes"
      description="Comprobantes asociados a tus reservas."
      table="comprobantes"
      filterBy="huesped_id"
    />
  );
}

