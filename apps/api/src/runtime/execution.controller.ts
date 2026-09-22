import { Controller, Param, Post, Req, UseGuards, Body } from '@nestjs/common';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { ExecuteAgentDto } from './execution.dto';
import { AgentExecutionService } from './execution.service';

@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class ExecutionController {
  constructor(private readonly executions: AgentExecutionService) {}

  @Post('agents/:agentId/executions')
  execute(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
    @Body() input: ExecuteAgentDto,
  ) {
    return this.executions.execute(
      request.user!.id,
      workspaceId,
      agentId,
      input,
    );
  }

  @Post('executions/:executionId/cancel')
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.executions.cancel(request.user!.id, workspaceId, executionId);
  }
}
