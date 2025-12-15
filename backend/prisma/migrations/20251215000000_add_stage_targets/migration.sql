-- Create table for per-stage target dates
CREATE TABLE "RequestStageTarget" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "targetDate" DATETIME NOT NULL,
  "setByUserId" TEXT,
  "setByName" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestStageTarget_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RequestStageTarget_requestId_stage_key" ON "RequestStageTarget"("requestId","stage");

-- History table for target date changes
CREATE TABLE "RequestStageTargetHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "previousTarget" DATETIME,
  "newTarget" DATETIME NOT NULL,
  "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changedByUserId" TEXT,
  "changedByName" TEXT,
  CONSTRAINT "RequestStageTargetHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
