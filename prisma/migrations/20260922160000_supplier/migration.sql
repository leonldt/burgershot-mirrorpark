-- Rolle Lieferant + Lieferanten-Vertriebsdaten + Einkaufslisten

ALTER TYPE "Role" ADD VALUE 'SUPPLIER';

CREATE TABLE "SupplierProduct" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sollMenge" INTEGER NOT NULL DEFAULT 0,
    "istMenge" INTEGER NOT NULL DEFAULT 0,
    "einkaufspreisCents" INTEGER NOT NULL DEFAULT 0,
    "verkaufspreisCents" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupplierProduct_supplierId_productId_key" ON "SupplierProduct"("supplierId","productId");
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PurchaseList" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseList_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PurchaseList_supplierId_idx" ON "PurchaseList"("supplierId");
ALTER TABLE "PurchaseList" ADD CONSTRAINT "PurchaseList_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PurchaseListItem" (
    "id" TEXT NOT NULL,
    "purchaseListId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "menge" INTEGER NOT NULL,
    "einkaufspreisCents" INTEGER NOT NULL,
    "verkaufspreisCents" INTEGER NOT NULL,
    CONSTRAINT "PurchaseListItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PurchaseListItem_purchaseListId_idx" ON "PurchaseListItem"("purchaseListId");
ALTER TABLE "PurchaseListItem" ADD CONSTRAINT "PurchaseListItem_purchaseListId_fkey" FOREIGN KEY ("purchaseListId") REFERENCES "PurchaseList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseListItem" ADD CONSTRAINT "PurchaseListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;