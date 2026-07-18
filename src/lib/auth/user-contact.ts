import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Usuario } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export type UserContact = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
};

const metadataString = (metadata: Record<string, unknown> | undefined, key: string) => {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
};

export const authUserPhone = (user: Pick<User, "phone" | "user_metadata"> | null | undefined) =>
  user?.phone || metadataString(user?.user_metadata, "telefono") || metadataString(user?.user_metadata, "phone");

export const userContactsById = async (
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  usuarios: Pick<Usuario, "id" | "nombre">[],
) => {
  const entries = await Promise.all(
    usuarios.map(async (usuario): Promise<[string, UserContact]> => {
      const { data } = await supabase.auth.admin.getUserById(usuario.id);

      return [
        usuario.id,
        {
          id: usuario.id,
          nombre: usuario.nombre,
          email: data.user?.email ?? null,
          telefono: authUserPhone(data.user),
        },
      ];
    }),
  );

  return new Map(entries);
};

export const authUserIdsMatchingContact = async (
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  search: string,
) => {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return [];
  }

  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  return (data.users ?? [])
    .filter((user) => {
      const email = user.email?.toLowerCase() ?? "";
      const phone = authUserPhone(user)?.toLowerCase() ?? "";
      return email.includes(normalizedSearch) || phone.includes(normalizedSearch);
    })
    .map((user) => user.id);
};

export const authUserExistsByEmailOrPhone = async (
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
  phone: string,
) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    return { error };
  }

  const existingEmail = (data.users ?? []).some((user) => user.email?.trim().toLowerCase() === normalizedEmail);
  const existingPhone = (data.users ?? []).some((user) => authUserPhone(user)?.trim() === normalizedPhone);

  return { existingEmail, existingPhone };
};
