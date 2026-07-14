import Image from "next/image";
import { HabitacionForm } from "@/components/forms/HabitacionForm";
import { HabitacionEditDialog } from "@/components/forms/HabitacionEditDialog";
import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable } from "@/components/crud/table-columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { allColumnsValue, ilikePattern, orIlike, parseTableQuery, searchableColumnsByTable, sortableColumnsByTable, tableStateFromQuery, type TableQueryInput } from "@/lib/table-server";
import { selectTarifaActualParaHabitacion } from "@/lib/tarifas";
import type { Habitacion, ImgHabitacion, Tarifa } from "@/types/database";

type HabitacionConImagenes = Habitacion & {
  img_habitaciones: Pick<ImgHabitacion, "id" | "url">[] | null;
  tarifa?: Pick<Tarifa, "precio_noche" | "temporada"> | null;
};

export default async function HabitacionesPage({ searchParams }: { searchParams: Promise<TableQueryInput> }) {
  await requireAdminModule("habitaciones");
  const supabase = createSupabaseAdminClient();
  const searchableColumns = searchableColumnsByTable.habitaciones ?? [];
  const sortableColumns = sortableColumnsByTable.habitaciones ?? [];
  const tableQuery = parseTableQuery(await searchParams, {
    defaultSort: "numero",
    defaultDir: "asc",
    searchableColumns,
    sortableColumns,
  });
  let habitacionesQuery = supabase
    .from("habitaciones")
    .select("*", { count: "exact" })
    .order(tableQuery.sort as "numero", { ascending: tableQuery.dir === "asc" })
    .range(tableQuery.from, tableQuery.to);

  if (tableQuery.q) {
    habitacionesQuery =
      tableQuery.qColumn === allColumnsValue
        ? habitacionesQuery.or(orIlike(searchableColumns, tableQuery.q))
        : habitacionesQuery.ilike(tableQuery.qColumn as "numero", ilikePattern(tableQuery.q));
  }

  const { data, count } = await habitacionesQuery;

  const habitacionIds = (data ?? []).map((habitacion) => habitacion.id);
  const [{ data: imagenes }, { data: tarifas }, { data: availableTarifas }] =
    habitacionIds.length > 0
      ? await Promise.all([
          supabase
            .from("img_habitaciones")
            .select("id,habitacion_id,url,created_at")
            .in("habitacion_id", habitacionIds)
            .order("created_at"),
          supabase
            .from("tarifas")
            .select("id,habitacion_tipo,temporada,precio_noche,peso,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
            .eq("activa", true)
            .order("peso", { ascending: false }),
          supabase
            .from("tarifas")
            .select("id,habitacion_tipo,temporada,precio_noche,peso,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
            .eq("activa", true)
            .order("habitacion_tipo"),
        ])
      : await Promise.all([
          Promise.resolve({ data: [] }),
          Promise.resolve({ data: [] }),
          supabase
            .from("tarifas")
            .select("id,habitacion_tipo,temporada,precio_noche,peso,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
            .eq("activa", true)
            .order("habitacion_tipo"),
        ]);
  const imagesByRoom = new Map<string, Pick<ImgHabitacion, "id" | "url">[]>();
  const tariffsByRoom = new Map<string, Pick<Tarifa, "precio_noche" | "temporada">>();

  for (const image of imagenes ?? []) {
    const currentImages = imagesByRoom.get(image.habitacion_id) ?? [];
    currentImages.push({ id: image.id, url: image.url });
    imagesByRoom.set(image.habitacion_id, currentImages);
  }

  for (const habitacion of data ?? []) {
    const tarifa = selectTarifaActualParaHabitacion(habitacion, tarifas ?? []);

    if (tarifa) {
      tariffsByRoom.set(habitacion.id, {
        precio_noche: tarifa.precio_noche,
        temporada: tarifa.temporada,
      });
    }
  }

  const habitaciones = (data ?? []).map((habitacion) => ({
    ...habitacion,
    img_habitaciones: imagesByRoom.get(habitacion.id) ?? [],
    tarifa: tariffsByRoom.get(habitacion.id) ?? null,
  })) as HabitacionConImagenes[];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Habitaciones</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">CRUD inicial de habitaciones.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nueva habitación</CardTitle>
        </CardHeader>
        <CardContent>
          <HabitacionForm tarifas={availableTarifas ?? []} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<HabitacionConImagenes>
            data={habitaciones}
            empty="No hay habitaciones registradas."
            serverState={tableStateFromQuery(tableQuery, count ?? 0)}
            searchableColumns={searchableColumns}
            sortableColumns={sortableColumns}
            columns={[
              {
                key: "fotos_preview",
                header: "Fotos preview",
                render: (row) => {
                  const image = row.img_habitaciones?.[0];

                  if (!image) {
                    return <span className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Sin imagen</span>;
                  }

                  return (
                    <div className="relative h-16 w-24 overflow-hidden rounded-2xl border border-[#d8d4c8] bg-[#f6f1e6] dark:border-[#314237] dark:bg-[#1d2c23]">
                      <Image
                        src={image.url}
                        alt={`Habitación ${row.numero}`}
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  );
                },
              },
              ...columnsForTable<Habitacion>("habitaciones", data ?? []),
              { key: "imagenes", header: "Fotos", render: (row) => row.img_habitaciones?.length ?? 0 },
              {
                key: "acciones",
                header: "Acciones",
                render: (row) => <HabitacionEditDialog habitacion={row} tarifas={availableTarifas ?? []} />,
              },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}
