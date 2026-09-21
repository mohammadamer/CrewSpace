export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DomainError('VALIDATION_ERROR', `${field} is required`);
  }
  return normalized;
}
