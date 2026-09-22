-- Manuelle Trinkgeld-Einträge (ohne Bestellbezug)
ALTER TABLE "TipTransaction" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "TipTransaction" ADD COLUMN "note" TEXT;
ALTER TABLE "TipTransaction" ADD COLUMN "createdById" TEXT;