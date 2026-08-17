import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Benutzername fehlt"),
  password: z.string().min(1, "Passwort fehlt"),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  priceCents: z.coerce.number().int().min(0, "Preis darf nicht negativ sein").max(100_000_000),
  categoryId: z.string().min(1),
  sortOrder: z.coerce.number().int().min(0).default(0),
  active: z.coerce.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich").max(40),
  sortOrder: z.coerce.number().int().min(0).default(0),
  active: z.coerce.boolean().default(true),
});

export const menuSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  priceCents: z.coerce.number().int().min(0, "Preis darf nicht negativ sein").max(100_000_000),
  categoryId: z.string().min(1),
  sortOrder: z.coerce.number().int().min(0).default(0),
  active: z.coerce.boolean().default(true),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(99) })).min(1, "Mindestens ein Produkt"),
});

const idSchema = z.string().min(1).max(64);

export { idSchema };

export const employeeSchema = z.object({
  username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,30}$/, "Benutzername: 3–30 Zeichen, nur Buchstaben, Zahlen, _"),
  firstName: z.string().trim().min(1, "Vorname erforderlich").max(60),
  lastName: z.string().trim().min(1, "Nachname erforderlich").max(60),
  role: z.enum(["ADMIN", "EMPLOYEE", "KITCHEN"]),
});

export const passwordSchema = z.object({ password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben").max(200) });

export const orderLineSchema = z.object({
  kind: z.enum(["product", "menu"]),
  id: idSchema,
  quantity: z.coerce.number().int().min(1).max(99),
});

export const orderSubmitSchema = z.object({
  cartToken: z.string().min(8).max(64),
  lines: z.array(orderLineSchema).min(1).max(50),
});

export const paymentSchema = z.object({
  orderId: idSchema,
  givenCents: z.coerce.number().int().min(0),
  tipCents: z.coerce.number().int().min(0).default(0),
});

export const payoutSchema = z.object({
  employeeId: idSchema,
  amountCents: z.coerce.number().int().min(1),
});