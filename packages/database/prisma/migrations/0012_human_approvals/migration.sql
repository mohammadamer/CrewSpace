CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "ApprovalRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'DESTRUCTIVE');

CREATE TABLE "AgentToolPermission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "agentId" UUID NOT NULL,
  "capability" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentToolPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "agentId" UUID NOT NULL,
  "reviewedByUserId" UUID,
  "capability" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "risk" "ApprovalRisk" NOT NULL,
  "payload" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentToolPermission_agentId_capability_key" ON "AgentToolPermission"("agentId", "capability");
CREATE INDEX "AgentToolPermission_workspaceId_enabled_idx" ON "AgentToolPermission"("workspaceId", "enabled");
CREATE INDEX "ApprovalRequest_workspaceId_status_createdAt_idx" ON "ApprovalRequest"("workspaceId", "status", "createdAt");
CREATE INDEX "ApprovalRequest_agentId_createdAt_idx" ON "ApprovalRequest"("agentId", "createdAt");

ALTER TABLE "AgentToolPermission" ADD CONSTRAINT "AgentToolPermission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentToolPermission" ADD CONSTRAINT "AgentToolPermission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
