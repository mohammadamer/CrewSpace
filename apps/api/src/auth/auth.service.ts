import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './auth.dto';

const SESSION_DAYS = 30;

function hashPassword(
  password: string,
  salt = randomBytes(16).toString('hex'),
): string {
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const [salt, expected] = encoded.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterDto): Promise<{
    token: string;
    user: { id: string; email: string; displayName: string };
  }> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email is already registered');

    const user = await this.prisma.user.create({
      data: {
        email,
        displayName: input.displayName.trim(),
        passwordHash: hashPassword(input.password),
      },
    });
    return {
      token: await this.createSession(user.id),
      user: this.publicUser(user),
    };
  }

  async login(
    emailInput: string,
    password: string,
  ): Promise<{
    token: string;
    user: { id: string; email: string; displayName: string };
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: emailInput.toLowerCase().trim() },
    });
    if (!user || !verifyPassword(password, user.passwordHash))
      throw new UnauthorizedException('Invalid credentials');
    return {
      token: await this.createSession(user.id),
      user: this.publicUser(user),
    };
  }

  async resolveToken(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date())
      throw new UnauthorizedException('Session expired');
    return this.publicUser(session.user);
  }

  async logout(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  private async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.session.create({
      data: { tokenHash: hashToken(token), userId, expiresAt },
    });
    return token;
  }

  private publicUser(user: { id: string; email: string; displayName: string }) {
    return { id: user.id, email: user.email, displayName: user.displayName };
  }
}
