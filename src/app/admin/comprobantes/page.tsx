import { GenericModulePage } from "@/components/crud/GenericModulePage";

export default function ComprobantesPage() {
  return (
    <GenericModulePage
      title="Comprobantes"
      description="Comprobantes de pago asociados a reservas."
      module="comprobantes"
      table="comprobantes"
    />
  );
}

