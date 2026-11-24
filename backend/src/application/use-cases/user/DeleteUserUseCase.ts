import { BadRequestError } from '../../../domain/errors/BadRequestError';
import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { IHashService } from '../../../domain/services/IHashService';

export class DeleteUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hash: IHashService,
  ) {}

  async execute(id: string, currentPassword: string) {
    const expectedHash = await this.users.findPasswordHashByUserId(id);
    if (
      !expectedHash ||
      !(await this.hash.compare(currentPassword, expectedHash))
    ) {
      throw new BadRequestError('Current password is incorrect.');
    }

    const deleted = await this.users.delete(id, expectedHash);
    if (!deleted)
      throw new BadRequestError('Credentials changed; sign in again.');
  }
}
