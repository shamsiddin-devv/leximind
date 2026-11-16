import { IUserRepository } from '../../../domain/repositories/IUserRepository';

export class GetUsersUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(page = 1, limit = 20) {
    return this.userRepo.findAll(page, limit);
  }
}
