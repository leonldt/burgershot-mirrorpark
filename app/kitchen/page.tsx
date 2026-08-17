import Header from "@/components/Header";
import { requireRole, Roles } from "@/lib/roles";
import { getKitchenOrders } from "@/actions/pos";
import KitchenClient from "@/components/kitchen/KitchenClient";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const user = await requireRole([Roles.KITCHEN, Roles.ADMIN]);
  const orders = await getKitchenOrders();
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header user={user} area="Küchenansicht" />
      <KitchenClient initialOrders={orders} />
    </div>
  );
}