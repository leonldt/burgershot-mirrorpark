import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { roleHome } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  redirect(user ? roleHome(user.role) : "/login");
}