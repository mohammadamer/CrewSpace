import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { OnboardingService } from './onboarding.service';

@Controller('workspaces/:workspaceId/onboarding')
@UseGuards(SessionGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post('initialize')
  initialize(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.onboarding.initialize(request.user!.id, workspaceId);
  }
}
