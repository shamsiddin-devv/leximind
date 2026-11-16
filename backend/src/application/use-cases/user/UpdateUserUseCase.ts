import { UpdateUserUseCaseDto } from '../../dto/user/UpdateUserUseCaseDto';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';

export class UpdateUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  execute(id: string, dto: UpdateUserUseCaseDto) {
    return this.userRepo.edit(id, (user) => user.update(dto));
  }
}
