CREATE TABLE "AgentRelationship" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "agentId" UUID NOT NULL,
  "relatedAgentId" UUID NOT NULL,
  "summary" TEXT,
  "interactionCount" INTEGER NOT NULL DEFAULT 0,
  "communicationPreferences" JSONB NOT NULL,
  "recentInteractions" JSONB NOT NULL,
  "unresolvedTopics" JSONB NOT NULL,
  "lastInteractionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentRelationship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AgentRelationship_distinct_agents_check" CHECK ("agentId" <> "relatedAgentId")
);

CREATE UNIQUE INDEX "AgentRelationship_workspaceId_agentId_relatedAgentId_key" ON "AgentRelationship"("workspaceId", "agentId", "relatedAgentId");
CREATE INDEX "AgentRelationship_workspaceId_updatedAt_idx" ON "AgentRelationship"("workspaceId", "updatedAt");
CREATE INDEX "AgentRelationship_agentId_relatedAgentId_idx" ON "AgentRelationship"("agentId", "relatedAgentId");

ALTER TABLE "AgentRelationship" ADD CONSTRAINT "AgentRelationship_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentRelationship" ADD CONSTRAINT "AgentRelationship_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentRelationship" ADD CONSTRAINT "AgentRelationship_relatedAgentId_fkey" FOREIGN KEY ("relatedAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
