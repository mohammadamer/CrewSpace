import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, SessionGuard } from './session.guard';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() input: RegisterDto) {
    return this.auth.register(input);
  }

  @Post('login')
  login(@Body() input: LoginDto) {
    return this.auth.login(input.email, input.password);
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  async logout(@Req() request: AuthenticatedRequest): Promise<{ ok: true }> {
    await this.auth.logout(request.sessionToken!);
    return { ok: true };
  }

  @Post('session')
  @UseGuards(SessionGuard)
  getSession(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }
}
