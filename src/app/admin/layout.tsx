import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requireRole } from "@/lib/auth/require-role";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await requireRole(["admin", "recepcionista", "limpieza"]);

  return (
    <div className="min-h-screen bg-[#f6f1e6] dark:bg-[#101a14] md:grid md:grid-cols-[280px_1fr]">
      <AdminSidebar role={currentUser.profile!.rol} />
      <main className="min-w-0 px-4 py-6 md:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
