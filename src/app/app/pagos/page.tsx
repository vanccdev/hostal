import { ClientGenericPage } from "@/components/crud/ClientGenericPage";

export default function PagosPage() {
  return (
    <ClientGenericPage
      title="Pagos"
      description="Pagos asociados a tus reservas."
      table="transacciones"
      filterBy="huesped_id"
    />
  );
}

