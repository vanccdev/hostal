import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable, genericRows } from "@/components/crud/table-columns";
import { StaySettingsForm } from "@/components/forms/StaySettingsForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { getStaySettings, staySettingKeys } from "@/lib/stay-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { GenericRow } from "@/types/database";

export default async function ConfiguracionPage() {
  await requireAdminModule("configuracion");
  const supabase = createSupabaseAdminClient();
  const [{ data: configuracion }, settings] = await Promise.all([
    supabase.from("configuracion_hostal").select("*").order("clave"),
    getStaySettings(supabase),
  ]);
  const rows = genericRows(configuracion);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Reglas operativas del hostal y parámetros usados por reservas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reglas de estadía</CardTitle>
          <CardDescription>
            Se guardan en <span className="font-mono">configuracion_hostal</span> y se usan al calcular horarios programados de reservas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaySettingsForm settings={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Asociación con reservas</CardTitle>
          <CardDescription>
            Al crear una reserva, estas claves generan <span className="font-mono">checkin_programado_at</span> y{" "}
            <span className="font-mono">checkout_programado_at</span>. Los eventos reales de recepción siguen usando{" "}
            <span className="font-mono">checkin_at</span> y <span className="font-mono">checkout_at</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <ConfigDefinition label="Check-in" settingKey={staySettingKeys.checkinTime} value={settings.checkinTime} />
            <ConfigDefinition label="Check-out" settingKey={staySettingKeys.checkoutTime} value={settings.checkoutTime} />
            <ConfigDefinition
              label="Preparación automática"
              settingKey={staySettingKeys.turnoverMinutes}
              value={`${settings.turnoverMinutes} minutos`}
            />
            <ConfigDefinition label="Zona horaria fija" settingKey={staySettingKeys.timezone} value={settings.timezone} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
          <CardDescription>CRUD base de claves en la tabla real de configuración.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable<GenericRow>
            data={rows}
            empty="No hay configuración registrada."
            columns={columnsForTable<GenericRow>("configuracion_hostal", rows)}
          />
        </CardContent>
      </Card>
    </section>
  );
}

const ConfigDefinition = ({ label, settingKey, value }: { label: string; settingKey: string; value: string }) => (
  <div className="rounded-xl border border-[#d8d4c8] p-3 dark:border-[#314237]">
    <dt className="font-semibold text-[#18221b] dark:text-zinc-100">{label}</dt>
    <dd className="mt-1 font-mono text-xs text-[#66736a] dark:text-[#b7c0b4]">{settingKey}</dd>
    <dd className="mt-2 text-[#18221b] dark:text-zinc-100">{value}</dd>
  </div>
);
