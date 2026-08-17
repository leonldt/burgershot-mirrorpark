import Header from "@/components/Header";
import { requireRole, Roles } from "@/lib/roles";
import { getPosCatalog, getReadyOrders } from "@/actions/pos";
import PosClient from "@/components/pos/PosClient";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const user = await requireRole([Roles.EMPLOYEE, Roles.ADMIN]);
  const [catalog, readyOrders] = await Promise.all([getPosCatalog(), getReadyOrders()]);
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        user={user}
        area="Kassenterminal"
        tabs={[
          { href: "/pos", label: "Kasse", active: true },
          { href: "/me", label: "Mein Trinkgeld" },
        ]}
      />
      <PosClient catalog={catalog} readyOrders={readyOrders} />
    </div>
  );
}