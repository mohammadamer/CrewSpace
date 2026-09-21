import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { CreateWorkspaceDto } from './workspace.dto';
import { WorkspaceService } from './workspace.service';

@Controller('workspaces')
@UseGuards(SessionGuard)
export class WorkspaceController {
  constructor(private readonly workspaces: WorkspaceService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.workspaces.listForUser(request.user!.id);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateWorkspaceDto,
  ) {
    return this.workspaces.create(request.user!.id, input);
  }

  @Get(':workspaceId')
  async get(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    const membership = await this.workspaces.requireMembership(
      request.user!.id,
      workspaceId,
    );
    return { workspaceId, role: membership.role };
  }
}
