import { DomainError } from './DomainError';
export class UnavailableError extends DomainError {
  constructor(message: string) {
    super(message, 'UNAVAILABLE');
  }
}
