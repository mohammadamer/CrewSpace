import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma.service';
import { WorkspaceController } from './workspace/workspace.controller';
import { WorkspaceService } from './workspace/workspace.service';
import { EventsGateway } from './events/events.gateway';
import { InMemoryEventBus } from './events/event-bus';
import { PermissionPolicy } from './permissions/permission.policy';
import { InvitationController } from './invitations/invitation.controller';
import { InvitationService } from './invitations/invitation.service';
import { MemberController } from './workspace/member.controller';
import { MemberService } from './workspace/member.service';
import { AgentController } from './agents/agent.controller';
import { AgentService } from './agents/agent.service';
import { ConversationController } from './conversations/conversation.controller';
import { ConversationService } from './conversations/conversation.service';
import { ExecutionController } from './runtime/execution.controller';
import { AgentExecutionService } from './runtime/execution.service';
import { ExecutionRunner } from './runtime/execution-runner';
import { MockRuntime } from './runtime/agent-runtime';
import { AgentCommunicationController } from './agent-communication/communication.controller';
import { AgentCommunicationService } from './agent-communication/communication.service';
import { AgentCommunicationPolicy } from './agent-communication/communication.policy';
import { CollaborationContextController } from './collaboration-context/context.controller';
import { CollaborationContextService } from './collaboration-context/context.service';
import { InitiativeController } from './initiative/initiative.controller';
import { InitiativeService } from './initiative/initiative.service';
import { AgentScheduler } from './initiative/agent-scheduler';

@Module({
  controllers: [
    HealthController,
    AuthController,
    WorkspaceController,
    InvitationController,
    MemberController,
    AgentController,
    ConversationController,
    ExecutionController,
    AgentCommunicationController,
    CollaborationContextController,
    InitiativeController,
  ],
  providers: [
    PrismaService,
    AuthService,
    WorkspaceService,
    PermissionPolicy,
    InMemoryEventBus,
    EventsGateway,
    InvitationService,
    MemberService,
    AgentService,
    ConversationService,
    AgentExecutionService,
    {
      provide: ExecutionRunner,
      useFactory: () => new ExecutionRunner(new MockRuntime()),
    },
    AgentCommunicationService,
    AgentCommunicationPolicy,
    CollaborationContextService,
    InitiativeService,
    AgentScheduler,
  ],
})
export class AppModule {}
