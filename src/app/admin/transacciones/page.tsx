import { GenericModulePage } from "@/components/crud/GenericModulePage";

export default function TransaccionesPage() {
  return (
    <GenericModulePage
      title="Transacciones"
      description="Gestión inicial de pagos y movimientos."
      module="transacciones"
      table="transacciones"
    />
  );
}

