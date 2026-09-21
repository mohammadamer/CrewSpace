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

@Module({
  controllers: [HealthController, AuthController, WorkspaceController],
  providers: [
    PrismaService,
    AuthService,
    WorkspaceService,
    PermissionPolicy,
    InMemoryEventBus,
    EventsGateway,
  ],
})
export class AppModule {}
