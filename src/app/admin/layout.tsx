import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requireRole } from "@/lib/auth/require-role";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await requireRole(["admin", "recepcionista", "limpieza"]);

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr]">
      <AdminSidebar role={currentUser.profile!.rol} />
      <main className="min-w-0 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}

