import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { HabitacionForm } from "@/components/forms/HabitacionForm";
import { DataTable } from "@/components/crud/DataTable";
import { columnsForTable } from "@/components/crud/table-columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Habitacion, ImgHabitacion, Tarifa } from "@/types/database";

type HabitacionConImagenes = Habitacion & {
  img_habitaciones: Pick<ImgHabitacion, "id" | "url">[] | null;
  tarifa?: Pick<Tarifa, "precio_noche" | "temporada"> | null;
};

export default async function HabitacionesPage() {
  await requireAdminModule("habitaciones");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("habitaciones").select("*").order("numero");

  const habitacionIds = (data ?? []).map((habitacion) => habitacion.id);
  const tariffIds = (data ?? []).map((habitacion) => habitacion.tarifa_id).filter((id): id is string => Boolean(id));
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
            .select("id,temporada,precio_noche,activa,created_at")
            .in("id", tariffIds.length > 0 ? tariffIds : ["00000000-0000-0000-0000-000000000000"])
            .eq("activa", true)
            .order("created_at", { ascending: false }),
          supabase
            .from("tarifas")
            .select("id,habitacion_tipo,temporada,precio_noche,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
            .eq("activa", true)
            .order("habitacion_tipo"),
        ])
      : await Promise.all([
          Promise.resolve({ data: [] }),
          Promise.resolve({ data: [] }),
          supabase
            .from("tarifas")
            .select("id,habitacion_tipo,temporada,precio_noche,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
            .eq("activa", true)
            .order("habitacion_tipo"),
        ]);
  const imagesByRoom = new Map<string, Pick<ImgHabitacion, "id" | "url">[]>();
  const tariffsByRoom = new Map<string, Pick<Tarifa, "precio_noche" | "temporada">>();
  const tariffsById = new Map((tarifas ?? []).map((tarifa) => [tarifa.id, tarifa]));

  for (const image of imagenes ?? []) {
    const currentImages = imagesByRoom.get(image.habitacion_id) ?? [];
    currentImages.push({ id: image.id, url: image.url });
    imagesByRoom.set(image.habitacion_id, currentImages);
  }

  for (const habitacion of data ?? []) {
    const tarifa = habitacion.tarifa_id ? tariffsById.get(habitacion.tarifa_id) : null;

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
            columns={[
              {
                key: "fotos_preview",
                header: "Fotos preview",
                render: (row) => {
                  const image = row.img_habitaciones?.[0];

                  if (!image) {
                    return <span className="text-sm text-[#717171] dark:text-[#b0b0b0]">Sin imagen</span>;
                  }

                  return (
                    <div className="relative h-16 w-24 overflow-hidden rounded-2xl border border-[#dddddd] bg-[#f7f7f7] dark:border-[#3a3a3a] dark:bg-[#242424]">
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
                render: (row) => (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/habitaciones/${row.id}/editar`}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Editar
                    </Link>
                  </Button>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}
