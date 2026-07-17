import { CompleteClientProfileDialog } from "@/components/app/CompleteClientProfileDialog";
import { UserNav } from "@/components/app/UserNav";
import { requireRole } from "@/lib/auth/require-role";
import { isClientProfileIncomplete } from "@/lib/client-profile";
import { getGuestForUser } from "@/lib/db/current-guest";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await requireRole(["cliente"]);
  const guest = currentUser.profile?.must_change_password ? null : await getGuestForUser(currentUser.authUserId);
  const shouldCompleteProfile = !currentUser.profile?.must_change_password && isClientProfileIncomplete(guest);

  return (
    <div className="min-h-screen bg-[#f6f1e6] dark:bg-[#101a14]">
      <UserNav />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      {shouldCompleteProfile ? (
        <CompleteClientProfileDialog guest={guest} profileName={currentUser.profile?.nombre ?? ""} />
      ) : null}
    </div>
  );
}
