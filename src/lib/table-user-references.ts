import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const userReferenceColumns = new Set([
  "created_by",
  "creado_por",
  "registrado_por",
  "gestionado_por",
  "cambiado_por",
  "verificado_por",
  "usuario_id",
  "actor_id",
]);

export const userIdsFromRows = <T extends object>(rows: T[]) => {
  const ids = new Set<string>();

  for (const row of rows) {
    const record = row as Record<string, unknown>;

    for (const column of userReferenceColumns) {
      const value = record[column];

      if (typeof value === "string" && value.trim()) {
        ids.add(value);
      }
    }
  }

  return [...ids];
};

export const userNamesByIdForRows = async (
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rows: object[],
) => {
  const ids = userIdsFromRows(rows);

  if (ids.length === 0) {
    return {};
  }

  const { data } = await supabase.from("usuarios").select("id,nombre").in("id", ids);

  return Object.fromEntries((data ?? []).map((usuario) => [usuario.id, usuario.nombre]));
};
