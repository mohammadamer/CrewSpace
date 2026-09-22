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
  CreateAgentDto,
  CreateAgentMemoryDto,
  CreatePersonaDto,
  UpdateAgentDto,
} from './agent.dto';
import { AgentService } from './agent.service';

@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class AgentController {
  constructor(private readonly agents: AgentService) {}

  @Get('agents')
  listAgents(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.agents.listAgents(request.user!.id, workspaceId);
  }

  @Get('agents/:agentId')
  getAgent(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
  ) {
    return this.agents.getAgent(request.user!.id, workspaceId, agentId);
  }

  @Post('agents')
  createAgent(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() input: CreateAgentDto,
  ) {
    return this.agents.createAgent(request.user!.id, workspaceId, input);
  }

  @Patch('agents/:agentId')
  updateAgent(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
    @Body() input: UpdateAgentDto,
  ) {
    return this.agents.updateAgent(
      request.user!.id,
      workspaceId,
      agentId,
      input,
    );
  }

  @Get('agents/:agentId/memories')
  listAgentMemories(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
  ) {
    return this.agents.listMemories(request.user!.id, workspaceId, agentId);
  }

  @Get('agents/:agentId/memories/:memoryId')
  getAgentMemory(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
    @Param('memoryId') memoryId: string,
  ) {
    return this.agents.getMemory(
      request.user!.id,
      workspaceId,
      agentId,
      memoryId,
    );
  }

  @Post('agents/:agentId/memories')
  createAgentMemory(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
    @Body() input: CreateAgentMemoryDto,
  ) {
    return this.agents.createMemory(
      request.user!.id,
      workspaceId,
      agentId,
      input,
    );
  }

  @Post('agents/starter-team')
  createStarterTeam(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.agents.createStarterTeam(request.user!.id, workspaceId);
  }

  @Get('personas')
  listPersonas(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.agents.listPersonas(request.user!.id, workspaceId);
  }

  @Post('personas')
  createPersona(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() input: CreatePersonaDto,
  ) {
    return this.agents.createPersona(request.user!.id, workspaceId, input);
  }
}
