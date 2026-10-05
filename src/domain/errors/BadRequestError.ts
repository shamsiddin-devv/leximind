import { DomainError } from "./DomainError";

export class BadRequestError extends DomainError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'BadRequestError';
  };
};