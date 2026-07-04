import { UserNav } from "@/components/app/UserNav";
import { requireRole } from "@/lib/auth/require-role";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["cliente"]);

  return (
    <div className="min-h-screen">
      <UserNav />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

