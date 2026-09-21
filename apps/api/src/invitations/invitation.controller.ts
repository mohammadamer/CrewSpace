import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import {
  AcceptInvitationDto,
  CreateEmailInvitationDto,
  CreateLinkInvitationDto,
} from './invitation.dto';
import { InvitationService } from './invitation.service';

@Controller()
@UseGuards(SessionGuard)
export class InvitationController {
  constructor(private readonly invitations: InvitationService) {}

  @Get('workspaces/:workspaceId/invitations')
  list(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.invitations.list(request.user!.id, workspaceId);
  }

  @Post('workspaces/:workspaceId/invitations/email')
  createEmail(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() input: CreateEmailInvitationDto,
  ) {
    return this.invitations.createEmail(request.user!.id, workspaceId, input);
  }

  @Post('workspaces/:workspaceId/invitations/link')
  createLink(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() input: CreateLinkInvitationDto,
  ) {
    return this.invitations.createLink(request.user!.id, workspaceId, input);
  }

  @Delete('workspaces/:workspaceId/invitations/:invitationId')
  revoke(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.invitations.revoke(request.user!.id, workspaceId, invitationId);
  }

  @Post('invitations/accept')
  accept(
    @Req() request: AuthenticatedRequest,
    @Body() input: AcceptInvitationDto,
  ) {
    return this.invitations.accept(request.user!.id, input);
  }
}
