-- Vereinheitlichung der Rollen: KITCHEN wird Teil von EMPLOYEE ("Mitarbeiter").
BEGIN;

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

UPDATE "User" SET "role" = 'EMPLOYEE' WHERE "role" = 'KITCHEN';

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYEE');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
DROP TYPE "Role_old";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';

COMMIT;
