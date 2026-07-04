import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPathByRole } from "@/lib/auth/redirect-by-role";

export default async function Home() {
  const currentUser = await getCurrentUser();
  redirect(currentUser ? getPathByRole(currentUser.profile) : "/login");
}
