import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { DemoService } from './demo.service';
import { IsString, MinLength } from 'class-validator';

class DemoReplyDto {
  @IsString()
  @MinLength(1)
  content!: string;
}

@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  @Post('demo-data')
  seed(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.demo.seedWorkspace(request.user!.id, workspaceId);
  }

  @Post('conversations/:conversationId/demo-reply')
  reply(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Body() input: DemoReplyDto,
  ) {
    return this.demo.reply(
      request.user!.id,
      workspaceId,
      conversationId,
      input.content,
    );
  }
}