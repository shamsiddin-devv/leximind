import { BadRequestError } from '../errors/BadRequestError';
export function validatePassword(password: string): void {
  if (
    typeof password !== 'string' ||
    password.length < 12 ||
    new TextEncoder().encode(password).length > 72
  )
    throw new BadRequestError(
      'Password must contain at least 12 characters and at most 72 UTF-8 bytes.',
    );
}
