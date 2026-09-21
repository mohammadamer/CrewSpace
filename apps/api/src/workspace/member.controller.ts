import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { UpdateMemberRoleDto, UpdateWorkspaceSettingsDto } from './member.dto';
import { MemberService } from './member.service';

@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class MemberController {
  constructor(private readonly members: MemberService) {}

  @Get('members')
  list(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.members.list(request.user!.id, workspaceId);
  }

  @Patch('members/:userId')
  updateRole(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Body() input: UpdateMemberRoleDto,
  ) {
    return this.members.updateRole(
      request.user!.id,
      workspaceId,
      userId,
      input,
    );
  }

  @Delete('members/:userId')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.members.remove(request.user!.id, workspaceId, userId);
  }

  @Patch('settings')
  updateSettings(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() input: UpdateWorkspaceSettingsDto,
  ) {
    return this.members.updateSettings(request.user!.id, workspaceId, input);
  }
}
