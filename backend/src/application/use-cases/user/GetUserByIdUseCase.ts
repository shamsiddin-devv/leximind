import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';

export class GetUserByIdUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(id: string) {
    const row = await this.userRepo.findById(id);

    if (!row) throw new NotFoundError('User not found.');

    return row;
  }
}
