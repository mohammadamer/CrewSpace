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
import { ProjectsController } from './work/projects.controller';
import { ProjectsService } from './work/projects.service';
import { ConveneController } from './convene/convene.controller';
import { ConveneService } from './convene/convene.service';
import { ApprovalController } from './approvals/approval.controller';
import { ApprovalService } from './approvals/approval.service';
import { AgentCommunicationController } from './agent-communication/communication.controller';
import { AgentCommunicationService } from './agent-communication/communication.service';
import { AgentCommunicationPolicy } from './agent-communication/communication.policy';
import { CollaborationContextController } from './collaboration-context/context.controller';
import { CollaborationContextService } from './collaboration-context/context.service';
import { InitiativeController } from './initiative/initiative.controller';
import { InitiativeService } from './initiative/initiative.service';
import { AgentScheduler } from './initiative/agent-scheduler';
import { IntegrationController } from './integrations/integration.controller';
import { IntegrationService } from './integrations/integration.service';
import { IntelligencePolicy } from './intelligence/intelligence.policy';
import { IntelligenceService } from './intelligence/intelligence.service';
import { DeviceService } from './devices/device.service';
import { ProviderIntegrationService } from './integrations/provider-integration.service';
import { NotificationService } from './notifications/notification.service';
import { ProviderService } from './providers/provider.service';
import { PushService } from './push/push.service';
import { SecretService } from './secrets/secret.service';
import { SyncPolicy } from './sync/sync.policy';
import { SyncService } from './sync/sync.service';

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
    ProjectsController,
    ConveneController,
    ApprovalController,
    AgentCommunicationController,
    CollaborationContextController,
    InitiativeController,
    IntegrationController,
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
    ProjectsService,
    ConveneService,
    ApprovalService,
    CollaborationContextService,
    InitiativeService,
    AgentScheduler,
    IntegrationService,
    IntelligencePolicy,
    IntelligenceService,
    NotificationService,
    DeviceService,
    ProviderIntegrationService,
    ProviderService,
    PushService,
    SecretService,
    SyncPolicy,
    SyncService,
  ],
})
export class AppModule {}
