-- AlterTable
ALTER TABLE "Request" ADD COLUMN "kpiMetric" TEXT;
ALTER TABLE "Request" ADD COLUMN "kpiTarget" INTEGER;
ALTER TABLE "Request" ADD COLUMN "regulatoryNotes" TEXT;
ALTER TABLE "Request" ADD COLUMN "regulatoryRequired" BOOLEAN DEFAULT false;
ALTER TABLE "Request" ADD COLUMN "regulatoryRiskLevel" TEXT;
ALTER TABLE "Request" ADD COLUMN "resourceEstimateWeeks" INTEGER;
ALTER TABLE "Request" ADD COLUMN "riceConfidence" INTEGER;
ALTER TABLE "Request" ADD COLUMN "riceEffort" INTEGER;
ALTER TABLE "Request" ADD COLUMN "riceImpact" INTEGER;
ALTER TABLE "Request" ADD COLUMN "riceReach" INTEGER;
ALTER TABLE "Request" ADD COLUMN "riceScore" REAL;
ALTER TABLE "Request" ADD COLUMN "strategicAlignment" INTEGER;
