import { DomainError } from './DomainError';

export class BadRequestError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_INPUT');
    this.name = 'BadRequestError';
  }
}
