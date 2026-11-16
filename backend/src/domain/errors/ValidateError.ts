import { DomainError } from './DomainError';

export class ValidateError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION');
    this.name = 'ValidationError';
  }
}
