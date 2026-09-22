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
import {
  CreateApprovalRequestDto,
  UpdateToolPermissionDto,
} from './approval.dto';
import { ApprovalService } from './approval.service';

@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class ApprovalController {
  constructor(private readonly approvals: ApprovalService) {}

  @Get('approvals')
  list(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.approvals.list(request.user!.id, workspaceId);
  }

  @Post('agents/:agentId/approvals')
  request(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
    @Body() input: CreateApprovalRequestDto,
  ) {
    return this.approvals.request(
      request.user!.id,
      workspaceId,
      agentId,
      input,
    );
  }

  @Post('approvals/:approvalId/approve')
  approve(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('approvalId') approvalId: string,
  ) {
    return this.approvals.approve(request.user!.id, workspaceId, approvalId);
  }

  @Post('approvals/:approvalId/reject')
  reject(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('approvalId') approvalId: string,
  ) {
    return this.approvals.reject(request.user!.id, workspaceId, approvalId);
  }

  @Post('approvals/:approvalId/cancel')
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('approvalId') approvalId: string,
  ) {
    return this.approvals.cancel(request.user!.id, workspaceId, approvalId);
  }

  @Get('tool-permissions')
  listToolPermissions(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.approvals.listToolPermissions(request.user!.id, workspaceId);
  }

  @Post('tool-permissions')
  setToolPermission(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() input: UpdateToolPermissionDto,
  ) {
    return this.approvals.setToolPermission(
      request.user!.id,
      workspaceId,
      input,
    );
  }
}
