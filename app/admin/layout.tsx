import Header from "@/components/Header";
import AdminNav from "@/components/admin/AdminNav";
import { requireRole, Roles } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole([Roles.ADMIN]);
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header user={user} area="Admin Panel" />
      <div className="flex min-h-0 flex-1">
        <AdminNav />
        <main className="min-w-0 flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}