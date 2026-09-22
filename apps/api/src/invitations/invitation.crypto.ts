import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

export function createInvitationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashInvitationPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyInvitationPassword(
  password: string,
  encoded: string,
): boolean {
  const [salt, expected] = encoded.split(':');
  if (!salt || !expected) return false;
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(expected, 'hex'),
  );
}
