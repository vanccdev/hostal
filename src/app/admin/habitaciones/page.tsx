import Image from "next/image";
import { HabitacionForm } from "@/components/forms/HabitacionForm";
import { DataTable } from "@/components/crud/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Habitacion, ImgHabitacion } from "@/types/database";

type HabitacionConImagenes = Habitacion & {
  img_habitaciones: Pick<ImgHabitacion, "id" | "url">[] | null;
};

export default async function HabitacionesPage() {
  await requireAdminModule("habitaciones");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("habitaciones")
    .select("id,numero,tipo,piso,capacidad_max,descripcion,activa,created_at,img_habitaciones(id,url)")
    .order("numero");

  const habitaciones = (data ?? []) as HabitacionConImagenes[];

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
          <HabitacionForm />
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
                key: "imagen",
                header: "Imagen",
                render: (row) => {
                  const image = row.img_habitaciones?.[0];

                  if (!image) {
                    return <span className="text-sm text-zinc-500 dark:text-zinc-400">Sin imagen</span>;
                  }

                  return (
                    <div className="relative h-14 w-20 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                      <Image
                        src={image.url}
                        alt={`Habitación ${row.numero}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                  );
                },
              },
              { key: "numero", header: "Número", render: (row) => row.numero },
              { key: "tipo", header: "Tipo", render: (row) => row.tipo },
              { key: "piso", header: "Piso", render: (row) => row.piso },
              { key: "capacidad", header: "Capacidad", render: (row) => row.capacidad_max },
              { key: "imagenes", header: "Fotos", render: (row) => row.img_habitaciones?.length ?? 0 },
              { key: "activa", header: "Activa", render: (row) => <Badge variant="secondary">{row.activa === false ? "No" : "Sí"}</Badge> },
            ]}
          />
        </CardContent>
      </Card>
    </section>
  );
}
