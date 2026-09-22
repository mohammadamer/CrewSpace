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
  CreateCredentialDto,
  CreateIntegrationDto,
  UpdateIntegrationDto,
} from './integration.dto';
import { IntegrationService } from './integration.service';

@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class IntegrationController {
  constructor(private readonly integrations: IntegrationService) {}

  @Get('integrations')
  list(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.integrations.list(request.user!.id, workspaceId);
  }

  @Post('integrations')
  create(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() input: CreateIntegrationDto,
  ) {
    return this.integrations.create(request.user!.id, workspaceId, input);
  }

  @Get('integrations/:integrationId')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('integrationId') integrationId: string,
  ) {
    return this.integrations.get(request.user!.id, workspaceId, integrationId);
  }

  @Patch('integrations/:integrationId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('integrationId') integrationId: string,
    @Body() input: UpdateIntegrationDto,
  ) {
    return this.integrations.update(
      request.user!.id,
      workspaceId,
      integrationId,
      input,
    );
  }

  @Get('integrations/credentials')
  listCredentials(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.integrations.listCredentials(request.user!.id, workspaceId);
  }

  @Post('integrations/:integrationId/credentials')
  addCredential(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('integrationId') integrationId: string,
    @Body() input: CreateCredentialDto,
  ) {
    return this.integrations.addCredential(
      request.user!.id,
      workspaceId,
      integrationId,
      input,
    );
  }
}
