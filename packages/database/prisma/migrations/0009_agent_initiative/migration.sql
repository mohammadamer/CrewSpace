CREATE TYPE "AgentWakeStatus" AS ENUM ('EXECUTED', 'NO_ACTION', 'BLOCKED');

CREATE TABLE "AgentSchedule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "agentId" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "cadenceMinutes" INTEGER NOT NULL,
  "timezone" TEXT NOT NULL,
  "activeHoursStart" TEXT NOT NULL,
  "activeHoursEnd" TEXT NOT NULL,
  "cooldownMinutes" INTEGER NOT NULL DEFAULT 0,
  "dailyBudget" INTEGER NOT NULL DEFAULT 1,
  "budgetUsed" INTEGER NOT NULL DEFAULT 0,
  "budgetResetAt" TIMESTAMP(3),
  "lastWakeAt" TIMESTAMP(3),
  "nextWakeAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentWakeCycle" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "scheduleId" UUID NOT NULL,
  "status" "AgentWakeStatus" NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentWakeCycle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentSchedule_workspaceId_agentId_key" ON "AgentSchedule"("workspaceId", "agentId");
CREATE INDEX "AgentSchedule_workspaceId_enabled_nextWakeAt_idx" ON "AgentSchedule"("workspaceId", "enabled", "nextWakeAt");
CREATE INDEX "AgentWakeCycle_scheduleId_createdAt_idx" ON "AgentWakeCycle"("scheduleId", "createdAt");

ALTER TABLE "AgentSchedule" ADD CONSTRAINT "AgentSchedule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentSchedule" ADD CONSTRAINT "AgentSchedule_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentWakeCycle" ADD CONSTRAINT "AgentWakeCycle_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "AgentSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
