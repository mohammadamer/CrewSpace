import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { CreateAgentMessageDto } from './communication.dto';
import { AgentCommunicationService } from './communication.service';

@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class AgentCommunicationController {
  constructor(private readonly communications: AgentCommunicationService) {}

  @Post('conversations/:conversationId/agents/:sourceAgentId/messages')
  sendAgentMessage(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Param('sourceAgentId') sourceAgentId: string,
    @Body() input: CreateAgentMessageDto,
  ) {
    return this.communications.sendMessage(
      request.user!.id,
      workspaceId,
      conversationId,
      sourceAgentId,
      input,
    );
  }
}
