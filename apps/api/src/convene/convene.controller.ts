import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import {
  AddConveneParticipantDto,
  CompleteConveneDto,
  CreateConveneContributionDto,
  CreateConveneDto,
} from './convene.dto';
import { ConveneService } from './convene.service';

@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class ConveneController {
  constructor(private readonly convenes: ConveneService) {}

  @Get('convenes')
  list(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.convenes.list(request.user!.id, workspaceId);
  }

  @Get('convenes/:conveneId')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conveneId') conveneId: string,
  ) {
    return this.convenes.get(request.user!.id, workspaceId, conveneId);
  }

  @Post('convenes')
  create(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() input: CreateConveneDto,
  ) {
    return this.convenes.create(request.user!.id, workspaceId, input);
  }

  @Post('convenes/:conveneId/participants')
  addParticipant(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conveneId') conveneId: string,
    @Body() input: AddConveneParticipantDto,
  ) {
    return this.convenes.addParticipant(
      request.user!.id,
      workspaceId,
      conveneId,
      input,
    );
  }

  @Post('convenes/:conveneId/start')
  start(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conveneId') conveneId: string,
  ) {
    return this.convenes.start(request.user!.id, workspaceId, conveneId);
  }

  @Post('convenes/:conveneId/pause')
  pause(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conveneId') conveneId: string,
  ) {
    return this.convenes.pause(request.user!.id, workspaceId, conveneId);
  }

  @Post('convenes/:conveneId/resume')
  resume(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conveneId') conveneId: string,
  ) {
    return this.convenes.resume(request.user!.id, workspaceId, conveneId);
  }

  @Post('convenes/:conveneId/contributions')
  addContribution(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conveneId') conveneId: string,
    @Body() input: CreateConveneContributionDto,
  ) {
    return this.convenes.addContribution(
      request.user!.id,
      workspaceId,
      conveneId,
      input,
    );
  }

  @Post('convenes/:conveneId/complete')
  complete(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conveneId') conveneId: string,
    @Body() input: CompleteConveneDto,
  ) {
    return this.convenes.complete(
      request.user!.id,
      workspaceId,
      conveneId,
      input,
    );
  }

  @Post('convenes/:conveneId/cancel')
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conveneId') conveneId: string,
  ) {
    return this.convenes.cancel(request.user!.id, workspaceId, conveneId);
  }
}
