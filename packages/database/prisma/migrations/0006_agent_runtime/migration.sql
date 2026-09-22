CREATE TYPE "AgentExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'CANCELLED', 'TIMED_OUT', 'FAILED');

CREATE TABLE "AgentExecution" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agentId" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "status" "AgentExecutionStatus" NOT NULL DEFAULT 'QUEUED',
  "prompt" TEXT NOT NULL,
  "output" TEXT,
  "error" TEXT,
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "executionId" UUID NOT NULL,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsageRecord_executionId_key" ON "UsageRecord"("executionId");
CREATE INDEX "AgentExecution_workspaceId_createdAt_idx" ON "AgentExecution"("workspaceId", "createdAt");
CREATE INDEX "AgentExecution_agentId_createdAt_idx" ON "AgentExecution"("agentId", "createdAt");
CREATE INDEX "AgentExecution_workspaceId_status_idx" ON "AgentExecution"("workspaceId", "status");

ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AgentExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
