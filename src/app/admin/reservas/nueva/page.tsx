import { ReservaForm } from "@/components/forms/ReservaForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { userContactsById } from "@/lib/auth/user-contact";
import { getStaySettings } from "@/lib/stay-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Usuario } from "@/types/database";

export default async function NuevaReservaAdminPage() {
  await requireAdminModule("reservas");
  const supabase = createSupabaseAdminClient();
  const [{ data: habitaciones }, { data: tarifas }, { data: huespedes }, { data: reservas }, { data: bloqueos }, staySettings] = await Promise.all([
    supabase.from("habitaciones").select("id,numero,tipo,tarifa_id,piso,capacidad_max,descripcion,activa,created_at").order("numero"),
    supabase
      .from("tarifas")
      .select("id,habitacion_tipo,temporada,precio_noche,peso,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
      .eq("activa", true)
      .order("habitacion_tipo"),
    supabase
      .from("huespedes")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("reservas")
      .select("id,habitacion_id,fecha_ingreso,fecha_salida,estado,checkin_programado_at,checkout_programado_at")
      .in("estado", ["pendiente_pago", "confirmada", "checkin"]),
    supabase.from("bloqueos_fechas").select("id,habitacion_id,fecha_inicio,fecha_fin"),
    getStaySettings(supabase),
  ]);
  const habitacionIds = (habitaciones ?? []).map((habitacion) => habitacion.id);
  const { data: imagenes } =
    habitacionIds.length > 0
      ? await supabase
          .from("img_habitaciones")
          .select("id,habitacion_id,url")
          .in("habitacion_id", habitacionIds)
          .order("created_at")
      : { data: [] };
  const usuarioIds = Array.from(new Set((huespedes ?? []).map((huesped) => huesped.usuario_id)));
  const { data: usuarios } =
    usuarioIds.length > 0 ? await supabase.from("usuarios").select("id,nombre").in("id", usuarioIds) : { data: [] as Pick<Usuario, "id" | "nombre">[] };
  const contactsById = await userContactsById(supabase, usuarios ?? []);
  const huespedContacts = Object.fromEntries(
    (huespedes ?? []).map((huesped) => {
      const contact = contactsById.get(huesped.usuario_id);
      return [huesped.id, { nombre: contact?.nombre ?? "Cliente sin nombre", email: contact?.email ?? null }];
    }),
  );

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva reserva</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Selecciona un huésped existente para no duplicar cuentas.</p>
      </div>
      <Card id="datos-de-reserva" className="scroll-mt-4">
        <CardHeader>
          <CardTitle>Datos de reserva</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservaForm
            mode="staff"
            habitaciones={habitaciones ?? []}
            tarifas={tarifas ?? []}
            huespedes={huespedes ?? []}
            huespedContacts={huespedContacts}
            imagenes={imagenes ?? []}
            reservas={reservas ?? []}
            bloqueos={bloqueos ?? []}
            staySettings={staySettings}
            scrollTargetId="datos-de-reserva"
          />
        </CardContent>
      </Card>
    </section>
  );
}
