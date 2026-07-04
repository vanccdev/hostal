import { GenericModulePage } from "@/components/crud/GenericModulePage";

export default function ConfiguracionPage() {
  return (
    <GenericModulePage
      title="Configuración"
      description="Configuración crítica del hostal, solo admin."
      module="configuracion"
      table="configuracion_hostal"
    />
  );
}

