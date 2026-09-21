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

@Module({
  controllers: [
    HealthController,
    AuthController,
    WorkspaceController,
    InvitationController,
    MemberController,
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
  ],
})
export class AppModule {}
