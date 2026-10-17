-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "valid_from" DATE,
ADD COLUMN     "valid_until" DATE;
