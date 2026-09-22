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
  CreateRelationshipDto,
  RecordInteractionDto,
  UpdateRelationshipDto,
} from './context.dto';
import { CollaborationContextService } from './context.service';

@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class CollaborationContextController {
  constructor(private readonly context: CollaborationContextService) {}

  @Get('relationships')
  listRelationships(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.context.listRelationships(request.user!.id, workspaceId);
  }

  @Get('relationships/:relationshipId')
  getRelationship(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('relationshipId') relationshipId: string,
  ) {
    return this.context.getRelationship(
      request.user!.id,
      workspaceId,
      relationshipId,
    );
  }

  @Post('agents/:agentId/relationships')
  createRelationship(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
    @Body() input: CreateRelationshipDto,
  ) {
    return this.context.createRelationship(
      request.user!.id,
      workspaceId,
      agentId,
      input,
    );
  }

  @Patch('relationships/:relationshipId')
  updateRelationship(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('relationshipId') relationshipId: string,
    @Body() input: UpdateRelationshipDto,
  ) {
    return this.context.updateRelationship(
      request.user!.id,
      workspaceId,
      relationshipId,
      input,
    );
  }

  @Post('relationships/:relationshipId/interactions')
  recordInteraction(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('relationshipId') relationshipId: string,
    @Body() input: RecordInteractionDto,
  ) {
    return this.context.recordInteraction(
      request.user!.id,
      workspaceId,
      relationshipId,
      input,
    );
  }
}
