import { prisma } from "@/lib/prisma";
import { dayRange, todayStr } from "@/lib/date";

export type DashboardStats = {
  revenueCents: number;
  orderCount: number;
  avgOrderCents: number;
  tipCents: number;
  openCounts: Record<"PENDING" | "PREPARING" | "READY", number>;
  recentOrders: { id: string; number: number; status: string; totalCents: number; createdAt: Date; employeeName: string }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const { start, end } = dayRange(todayStr());
  const [completed, open, recent] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "COMPLETED", completedAt: { gte: start, lt: end } },
      _count: { _all: true },
      _sum: { totalCents: true, tipCents: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { status: { in: ["PENDING", "PREPARING", "READY"] } },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        number: true,
        status: true,
        totalCents: true,
        createdAt: true,
        employee: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const openCounts: Record<"PENDING" | "PREPARING" | "READY", number> = { PENDING: 0, PREPARING: 0, READY: 0 };
  for (const row of open) {
    if (row.status in openCounts) openCounts[row.status as keyof typeof openCounts] = row._count._all;
  }

  const orderCount = completed._count._all;
  const revenueCents = completed._sum.totalCents ?? 0;
  const tipCents = completed._sum.tipCents ?? 0;

  return {
    revenueCents,
    orderCount,
    avgOrderCents: orderCount > 0 ? Math.round(revenueCents / orderCount) : 0,
    tipCents,
    openCounts,
    recentOrders: recent.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      totalCents: o.totalCents,
      createdAt: o.createdAt,
      employeeName: o.employee ? `${o.employee.firstName} ${o.employee.lastName}` : "–",
    })),
  };
}

export type BalanceReport = {
  revenueCents: number;
  orderCount: number;
  avgOrderCents: number;
  tipCents: number;
  openCount: number;
  perEmployee: { employeeId: string; name: string; orders: number; revenueCents: number; tipCents: number }[];
  topProducts: { name: string; quantity: number }[];
};

export async function getBalanceReport(range: { start: Date; end: Date }): Promise<BalanceReport> {
  const completedWhere = { status: "COMPLETED" as const, completedAt: { gte: range.start, lt: range.end } };
  const createdWhere = { createdAt: { gte: range.start, lt: range.end } };

  const [completed, openCount, byEmployee, topProducts, employees] = await Promise.all([
    prisma.order.aggregate({ where: completedWhere, _count: { _all: true }, _sum: { totalCents: true, tipCents: true } }),
    prisma.order.count({ where: { ...createdWhere, status: { not: "COMPLETED" } } }),
    prisma.order.groupBy({
      by: ["employeeId"],
      where: completedWhere,
      _count: { _all: true },
      _sum: { totalCents: true, tipCents: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: { status: "COMPLETED", completedAt: { gte: range.start, lt: range.end } } },
      _sum: { quantity: true },
    }),
    prisma.user.findMany({ select: { id: true, firstName: true, lastName: true } }),
  ]);

  const nameById = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]));
  const orderCount = completed._count._all;
  const revenueCents = completed._sum.totalCents ?? 0;

  return {
    revenueCents,
    orderCount,
    avgOrderCents: orderCount > 0 ? Math.round(revenueCents / orderCount) : 0,
    tipCents: completed._sum.tipCents ?? 0,
    openCount,
    perEmployee: byEmployee.map((g) => ({
      employeeId: g.employeeId ?? "",
      name: nameById.get(g.employeeId ?? "") ?? "–",
      orders: g._count._all,
      revenueCents: g._sum.totalCents ?? 0,
      tipCents: g._sum.tipCents ?? 0,
    })),
    topProducts: topProducts
      .sort((a, b) => (b._sum.quantity ?? 0) - (a._sum.quantity ?? 0))
      .slice(0, 10)
      .map((p) => ({ name: p.productName, quantity: p._sum.quantity ?? 0 })),
  };
}