CREATE TYPE "AgentMemoryType" AS ENUM ('OBSERVATION', 'NOTE', 'FACT', 'LEARNING', 'FILE_SUMMARY');
CREATE TYPE "AgentKnowledgeVisibility" AS ENUM ('PRIVATE', 'SHARED');

CREATE TABLE "AgentMemory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agentId" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "type" "AgentMemoryType" NOT NULL DEFAULT 'OBSERVATION',
  "title" TEXT,
  "content" TEXT NOT NULL,
  "source" TEXT,
  "visibility" "AgentKnowledgeVisibility" NOT NULL DEFAULT 'PRIVATE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentMemory_agentId_createdAt_idx" ON "AgentMemory"("agentId", "createdAt");
CREATE INDEX "AgentMemory_workspaceId_createdAt_idx" ON "AgentMemory"("workspaceId", "createdAt");

ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
