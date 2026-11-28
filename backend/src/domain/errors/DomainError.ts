export type DomainErrorCode =
  | 'INVALID_INPUT'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'VALIDATION'
  | 'UNAVAILABLE'
  | 'RATE_LIMITED';
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: DomainErrorCode,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
