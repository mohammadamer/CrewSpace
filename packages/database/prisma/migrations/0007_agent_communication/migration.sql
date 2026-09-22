CREATE TYPE "AgentCommunicationStatus" AS ENUM ('ALLOWED', 'BLOCKED');

CREATE TABLE "AgentCommunication" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "sourceAgentId" UUID NOT NULL,
  "targetAgentId" UUID NOT NULL,
  "messageId" UUID,
  "depth" INTEGER NOT NULL,
  "tokenCount" INTEGER NOT NULL,
  "status" "AgentCommunicationStatus" NOT NULL DEFAULT 'ALLOWED',
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentCommunication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentCommunication_messageId_key" ON "AgentCommunication"("messageId");
CREATE INDEX "AgentCommunication_workspaceId_createdAt_idx" ON "AgentCommunication"("workspaceId", "createdAt");
CREATE INDEX "AgentCommunication_conversationId_createdAt_idx" ON "AgentCommunication"("conversationId", "createdAt");
CREATE INDEX "AgentCommunication_sourceAgentId_targetAgentId_createdAt_idx" ON "AgentCommunication"("sourceAgentId", "targetAgentId", "createdAt");

ALTER TABLE "AgentCommunication" ADD CONSTRAINT "AgentCommunication_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentCommunication" ADD CONSTRAINT "AgentCommunication_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentCommunication" ADD CONSTRAINT "AgentCommunication_sourceAgentId_fkey" FOREIGN KEY ("sourceAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentCommunication" ADD CONSTRAINT "AgentCommunication_targetAgentId_fkey" FOREIGN KEY ("targetAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentCommunication" ADD CONSTRAINT "AgentCommunication_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
