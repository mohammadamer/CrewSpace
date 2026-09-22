import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import {
  CreateConversationDto,
  CreateMessageDto,
  ListMessagesQueryDto,
} from './conversation.dto';
import { ConversationService } from './conversation.service';

@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class ConversationController {
  constructor(private readonly conversations: ConversationService) {}

  @Post('conversations')
  createConversation(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() input: CreateConversationDto,
  ) {
    return this.conversations.createConversation(
      request.user!.id,
      workspaceId,
      input,
    );
  }

  @Get('conversations')
  listConversations(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.conversations.listConversations(request.user!.id, workspaceId);
  }

  @Get('conversations/:conversationId')
  getConversation(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversations.getConversation(
      request.user!.id,
      workspaceId,
      conversationId,
    );
  }

  @Post('conversations/:conversationId/messages')
  createMessage(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Body() input: CreateMessageDto,
  ) {
    return this.conversations.createMessage(
      request.user!.id,
      workspaceId,
      conversationId,
      input,
    );
  }

  @Get('conversations/:conversationId/messages')
  listMessages(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.conversations.listMessages(
      request.user!.id,
      workspaceId,
      conversationId,
      query,
    );
  }
}
