CREATE TYPE "AgentStatus" AS ENUM ('AVAILABLE', 'THINKING', 'WORKING', 'WAITING', 'OFFLINE', 'ERROR');

CREATE TABLE "AgentPersona" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "personality" TEXT NOT NULL,
  "expertise" TEXT NOT NULL,
  "responsibilities" JSONB NOT NULL,
  "communicationStyle" TEXT NOT NULL,
  "behavioralRules" JSONB NOT NULL,
  "goals" JSONB NOT NULL,
  "constraints" JSONB NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentPersona_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Agent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "personaId" UUID,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "avatar" TEXT,
  "status" "AgentStatus" NOT NULL DEFAULT 'OFFLINE',
  "modelConfiguration" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentCapability" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agentId" UUID NOT NULL,
  "capability" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentCapability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentActivity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agentId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentPersona_workspaceId_name_key" ON "AgentPersona"("workspaceId", "name");
CREATE INDEX "AgentPersona_workspaceId_role_idx" ON "AgentPersona"("workspaceId", "role");
CREATE INDEX "Agent_workspaceId_status_idx" ON "Agent"("workspaceId", "status");
CREATE INDEX "Agent_personaId_idx" ON "Agent"("personaId");
CREATE UNIQUE INDEX "AgentCapability_agentId_capability_key" ON "AgentCapability"("agentId", "capability");
CREATE INDEX "AgentCapability_agentId_enabled_idx" ON "AgentCapability"("agentId", "enabled");
CREATE INDEX "AgentActivity_agentId_createdAt_idx" ON "AgentActivity"("agentId", "createdAt");

ALTER TABLE "AgentPersona" ADD CONSTRAINT "AgentPersona_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "AgentPersona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentCapability" ADD CONSTRAINT "AgentCapability_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentActivity" ADD CONSTRAINT "AgentActivity_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
