"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, Roles } from "@/lib/roles";
import { FORMATTED_ORDER_NUMBER } from "@/lib/constants";

export type PosProduct = { id: string; name: string; priceCents: number; description: string | null };
export type PosMenu = { id: string; name: string; priceCents: number; description: string | null };
export type PosCategory = { id: string; name: string; products: PosProduct[]; menus: PosMenu[] };

export async function getPosCatalog(): Promise<PosCategory[]> {
  await requireRole([Roles.EMPLOYEE, Roles.ADMIN]);
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      products: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, priceCents: true, description: true },
      },
      menus: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, priceCents: true, description: true },
      },
    },
  });
  return categories;
}

export type ReadyOrderDto = {
  id: string;
  number: string;
  totalCents: number;
  createdAtIso: string;
  employeeName: string;
  items: { name: string; qty: number }[];
};

export async function getReadyOrders(): Promise<ReadyOrderDto[]> {
  await requireRole([Roles.EMPLOYEE, Roles.ADMIN]);
  const orders = await prisma.order.findMany({
    where: { status: "READY" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      number: true,
      totalCents: true,
      createdAt: true,
      items: { select: { productName: true, quantity: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
  });
  return orders.map((o) => ({
    id: o.id,
    number: FORMATTED_ORDER_NUMBER(o.number),
    totalCents: o.totalCents,
    createdAtIso: o.createdAt.toISOString(),
    employeeName: o.employee ? `${o.employee.firstName} ${o.employee.lastName}` : "–",
    items: o.items.map((i) => ({ name: i.productName, qty: i.quantity })),
  }));
}

export type KitchenOrderDto = {
  id: string;
  number: string;
  status: "PENDING" | "PREPARING";
  createdAtIso: string;
  items: { name: string; qty: number }[];
  employeeName: string;
};

export async function getKitchenOrders(): Promise<KitchenOrderDto[]> {
  await requireRole([Roles.KITCHEN, Roles.ADMIN]);
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PENDING", "PREPARING"] } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      number: true,
      status: true,
      createdAt: true,
      items: { select: { productName: true, quantity: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
  });
  return orders.map((o) => ({
    id: o.id,
    number: FORMATTED_ORDER_NUMBER(o.number),
    status: o.status as "PENDING" | "PREPARING",
    createdAtIso: o.createdAt.toISOString(),
    items: o.items.map((i) => ({ name: i.productName, qty: i.quantity })),
    employeeName: o.employee ? `${o.employee.firstName} ${o.employee.lastName}` : "–",
  }));
}