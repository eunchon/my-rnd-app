/*
  Warnings:

  - You are about to alter the column `expectedRevenue` on the `Request` table. The data in that column could be lost. The data in that column will be cast from `Float` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "productArea" TEXT NOT NULL,
    "productModel" TEXT,
    "category" TEXT NOT NULL,
    "expectedRevenue" BIGINT,
    "importanceFlag" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerDeadline" DATETIME NOT NULL,
    "currentStage" TEXT NOT NULL,
    "currentStatus" TEXT,
    "createdByDept" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdByName" TEXT,
    "region" TEXT,
    "rawCustomerText" TEXT NOT NULL,
    "salesSummary" TEXT NOT NULL,
    "riceReach" INTEGER,
    "riceImpact" INTEGER,
    "riceConfidence" INTEGER,
    "riceEffort" INTEGER,
    "riceScore" REAL,
    "regulatoryRequired" BOOLEAN DEFAULT false,
    "regulatoryRiskLevel" TEXT,
    "regulatoryNotes" TEXT,
    "strategicAlignment" INTEGER,
    "resourceEstimateWeeks" INTEGER,
    "kpiMetric" TEXT,
    "kpiTarget" INTEGER,
    "revenueEstimateStatus" TEXT,
    "revenueEstimateNote" TEXT,
    "influenceRevenue" INTEGER DEFAULT 0,
    "influenceCustomer" INTEGER DEFAULT 0,
    "influenceCustomization" INTEGER DEFAULT 0,
    "influenceStrategy" INTEGER DEFAULT 0,
    "influenceTender" INTEGER DEFAULT 0,
    "influenceTotal" INTEGER DEFAULT 0,
    CONSTRAINT "Request_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Request" ("category", "createdByDept", "createdByUserId", "currentStage", "currentStatus", "customerDeadline", "customerName", "expectedRevenue", "id", "importanceFlag", "influenceCustomer", "influenceCustomization", "influenceRevenue", "influenceStrategy", "influenceTender", "influenceTotal", "kpiMetric", "kpiTarget", "productArea", "productModel", "rawCustomerText", "region", "regulatoryNotes", "regulatoryRequired", "regulatoryRiskLevel", "resourceEstimateWeeks", "revenueEstimateNote", "revenueEstimateStatus", "riceConfidence", "riceEffort", "riceImpact", "riceReach", "riceScore", "salesSummary", "strategicAlignment", "submittedAt", "title") SELECT "category", "createdByDept", "createdByUserId", "currentStage", "currentStatus", "customerDeadline", "customerName", "expectedRevenue", "id", "importanceFlag", "influenceCustomer", "influenceCustomization", "influenceRevenue", "influenceStrategy", "influenceTender", "influenceTotal", "kpiMetric", "kpiTarget", "productArea", "productModel", "rawCustomerText", "region", "regulatoryNotes", "regulatoryRequired", "regulatoryRiskLevel", "resourceEstimateWeeks", "revenueEstimateNote", "revenueEstimateStatus", "riceConfidence", "riceEffort", "riceImpact", "riceReach", "riceScore", "salesSummary", "strategicAlignment", "submittedAt", "title" FROM "Request";
DROP TABLE "Request";
ALTER TABLE "new_Request" RENAME TO "Request";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
