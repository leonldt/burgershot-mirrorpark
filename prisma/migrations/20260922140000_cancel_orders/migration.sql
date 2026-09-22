-- Stornierung einzelner Bestellungen
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLED';
ALTER TABLE "Order" ADD COLUMN "cancelledAt" TIMESTAMP(3);