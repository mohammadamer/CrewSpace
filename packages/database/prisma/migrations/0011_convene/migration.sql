CREATE TYPE "ConveneStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ConveneParticipantRole" AS ENUM ('FACILITATOR', 'PARTICIPANT', 'OBSERVER');
CREATE TYPE "ConveneContributionType" AS ENUM ('DISCUSSION', 'EVIDENCE', 'SYNTHESIS');

CREATE TABLE "Convene" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "projectId" UUID,
  "createdById" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "status" "ConveneStatus" NOT NULL DEFAULT 'DRAFT',
  "startedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Convene_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConveneParticipant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conveneId" UUID NOT NULL,
  "userId" UUID,
  "agentId" UUID,
  "role" "ConveneParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConveneParticipant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConveneParticipant_one_participant_type_check" CHECK (("userId" IS NOT NULL AND "agentId" IS NULL) OR ("userId" IS NULL AND "agentId" IS NOT NULL))
);

CREATE TABLE "ConveneContribution" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conveneId" UUID NOT NULL,
  "authorUserId" UUID,
  "authorAgentId" UUID,
  "type" "ConveneContributionType" NOT NULL DEFAULT 'DISCUSSION',
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConveneContribution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConveneContribution_one_author_type_check" CHECK (("authorUserId" IS NOT NULL AND "authorAgentId" IS NULL) OR ("authorUserId" IS NULL AND "authorAgentId" IS NOT NULL))
);

CREATE UNIQUE INDEX "ConveneParticipant_conveneId_userId_key" ON "ConveneParticipant"("conveneId", "userId");
CREATE UNIQUE INDEX "ConveneParticipant_conveneId_agentId_key" ON "ConveneParticipant"("conveneId", "agentId");
CREATE INDEX "Convene_workspaceId_status_updatedAt_idx" ON "Convene"("workspaceId", "status", "updatedAt");
CREATE INDEX "Convene_projectId_createdAt_idx" ON "Convene"("projectId", "createdAt");
CREATE INDEX "ConveneParticipant_userId_idx" ON "ConveneParticipant"("userId");
CREATE INDEX "ConveneParticipant_agentId_idx" ON "ConveneParticipant"("agentId");
CREATE INDEX "ConveneContribution_conveneId_createdAt_idx" ON "ConveneContribution"("conveneId", "createdAt");

ALTER TABLE "Convene" ADD CONSTRAINT "Convene_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Convene" ADD CONSTRAINT "Convene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Convene" ADD CONSTRAINT "Convene_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConveneParticipant" ADD CONSTRAINT "ConveneParticipant_conveneId_fkey" FOREIGN KEY ("conveneId") REFERENCES "Convene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConveneParticipant" ADD CONSTRAINT "ConveneParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConveneParticipant" ADD CONSTRAINT "ConveneParticipant_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConveneContribution" ADD CONSTRAINT "ConveneContribution_conveneId_fkey" FOREIGN KEY ("conveneId") REFERENCES "Convene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConveneContribution" ADD CONSTRAINT "ConveneContribution_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConveneContribution" ADD CONSTRAINT "ConveneContribution_authorAgentId_fkey" FOREIGN KEY ("authorAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_conveneId_fkey" FOREIGN KEY ("conveneId") REFERENCES "Convene"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Decision_conveneId_key" ON "Decision"("conveneId");
