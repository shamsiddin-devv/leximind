import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';

export class DeleteUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(id: string) {
    const findingUser = await this.userRepo.findById(id);
    if (!findingUser) throw new NotFoundError('User not found.');

    await this.userRepo.delete(id);
    return { success: true };
  }
}
