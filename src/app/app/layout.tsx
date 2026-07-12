import { UserNav } from "@/components/app/UserNav";
import { requireRole } from "@/lib/auth/require-role";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["cliente"]);

  return (
    <div className="min-h-screen bg-[#f7f7f7] dark:bg-[#151515]">
      <UserNav />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
