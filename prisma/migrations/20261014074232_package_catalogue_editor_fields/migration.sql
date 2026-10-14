-- AlterTable
ALTER TABLE "Addon" ADD COLUMN     "customQuote" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "customQuote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultTasks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "turnaroundLabel" TEXT;
