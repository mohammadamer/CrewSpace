CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "ProjectMemberRole" AS ENUM ('MEMBER', 'LEAD');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE "Project" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectMember" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "userId" UUID,
  "agentId" UUID,
  "role" "ProjectMemberRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectMember_one_member_type_check" CHECK (("userId" IS NOT NULL AND "agentId" IS NULL) OR ("userId" IS NULL AND "agentId" IS NOT NULL))
);

CREATE TABLE "Decision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "projectId" UUID,
  "createdById" UUID NOT NULL,
  "sourceConversationId" UUID,
  "title" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "alternatives" JSONB NOT NULL,
  "conclusion" TEXT NOT NULL,
  "provenance" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Task" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "assigneeUserId" UUID,
  "assigneeAgentId" UUID,
  "decisionId" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Task_one_assignee_type_check" CHECK (("assigneeUserId" IS NULL OR "assigneeAgentId" IS NULL))
);

CREATE TABLE "TaskDependency" (
  "taskId" UUID NOT NULL,
  "dependsOnTaskId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("taskId", "dependsOnTaskId"),
  CONSTRAINT "TaskDependency_distinct_tasks_check" CHECK ("taskId" <> "dependsOnTaskId")
);

CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");
CREATE UNIQUE INDEX "ProjectMember_projectId_agentId_key" ON "ProjectMember"("projectId", "agentId");
CREATE INDEX "Project_workspaceId_status_idx" ON "Project"("workspaceId", "status");
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");
CREATE INDEX "ProjectMember_agentId_idx" ON "ProjectMember"("agentId");
CREATE INDEX "Task_workspaceId_status_priority_idx" ON "Task"("workspaceId", "status", "priority");
CREATE INDEX "Task_projectId_status_idx" ON "Task"("projectId", "status");
CREATE INDEX "Task_assigneeUserId_idx" ON "Task"("assigneeUserId");
CREATE INDEX "Task_assigneeAgentId_idx" ON "Task"("assigneeAgentId");
CREATE INDEX "TaskDependency_dependsOnTaskId_idx" ON "TaskDependency"("dependsOnTaskId");
CREATE INDEX "Decision_workspaceId_createdAt_idx" ON "Decision"("workspaceId", "createdAt");
CREATE INDEX "Decision_projectId_createdAt_idx" ON "Decision"("projectId", "createdAt");

ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_sourceConversationId_fkey" FOREIGN KEY ("sourceConversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeAgentId_fkey" FOREIGN KEY ("assigneeAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
