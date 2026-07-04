import { GenericModulePage } from "@/components/crud/GenericModulePage";

export default function CancelacionesPage() {
  return (
    <GenericModulePage
      title="Cancelaciones"
      description="Solicitudes y registros de cancelación."
      module="cancelaciones"
      table="cancelaciones"
    />
  );
}

