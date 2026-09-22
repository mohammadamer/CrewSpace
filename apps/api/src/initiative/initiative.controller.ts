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
  CreateScheduleDto,
  UpdateScheduleDto,
  WakeScheduleDto,
} from './initiative.dto';
import { InitiativeService } from './initiative.service';

@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class InitiativeController {
  constructor(private readonly initiative: InitiativeService) {}

  @Get('schedules')
  listSchedules(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.initiative.listSchedules(request.user!.id, workspaceId);
  }

  @Post('agents/:agentId/schedules')
  createSchedule(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
    @Body() input: CreateScheduleDto,
  ) {
    return this.initiative.createSchedule(
      request.user!.id,
      workspaceId,
      agentId,
      input,
    );
  }

  @Patch('schedules/:scheduleId')
  updateSchedule(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() input: UpdateScheduleDto,
  ) {
    return this.initiative.updateSchedule(
      request.user!.id,
      workspaceId,
      scheduleId,
      input,
    );
  }

  @Post('schedules/:scheduleId/cancel')
  cancelSchedule(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.initiative.cancelSchedule(
      request.user!.id,
      workspaceId,
      scheduleId,
    );
  }

  @Post('schedules/:scheduleId/wake')
  wakeSchedule(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() input: WakeScheduleDto,
  ) {
    return this.initiative.wakeSchedule(
      request.user!.id,
      workspaceId,
      scheduleId,
      input,
    );
  }

  @Get('schedules/:scheduleId/wake-cycles')
  listWakeCycles(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.initiative.listWakeCycles(
      request.user!.id,
      workspaceId,
      scheduleId,
    );
  }
}
