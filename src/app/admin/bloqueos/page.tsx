import { GenericModulePage } from "@/components/crud/GenericModulePage";

export default function BloqueosPage() {
  return (
    <GenericModulePage
      title="Bloqueos de fechas"
      description="Fechas no reservables por habitación."
      module="bloqueos"
      table="bloqueos_fechas"
    />
  );
}

