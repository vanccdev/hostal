import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable, genericRows } from "@/components/crud/table-columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import type { AdminModule } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, GenericRow } from "@/types/database";

type TableName = keyof Database["public"]["Tables"];

type GenericModulePageProps = {
  title: string;
  description: string;
  module: AdminModule;
  table: TableName;
};

export const GenericModulePage = async ({ title, description, module, table }: GenericModulePageProps) => {
  await requireAdminModule(module);
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from(table).select("*").limit(100);
  const rows = genericRows(data);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<GenericRow>
            data={rows}
            empty="No hay registros."
            columns={columnsForTable<GenericRow>(table, rows)}
          />
        </CardContent>
      </Card>
    </section>
  );
};
