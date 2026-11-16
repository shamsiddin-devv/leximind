import { BadRequestError } from '../errors/BadRequestError';

export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: string): void {
  if (
    typeof password !== 'string' ||
    Array.from(password).length < MIN_PASSWORD_LENGTH ||
    new TextEncoder().encode(password).length > 72
  )
    throw new BadRequestError(
      'Password must contain at least ' +
        MIN_PASSWORD_LENGTH +
        ' characters and at most 72 UTF-8 bytes.',
    );
}
