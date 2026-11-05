import { DomainError } from "./DomainError";

export class ValidateError extends DomainError {
  constructor(message: string) {
    super(message, 422);
    this.name = 'ValidationError';
  };
};