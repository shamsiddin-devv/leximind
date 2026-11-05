import { UpdateUserUseCaseDto } from "src/application/dto/user/UpdateUserUseCaseDto";
import { NotFoundError } from "src/domain/errors/NotFoundError";
import { IUserRepository } from "src/domain/repositories/IUserRepository";

export class UpdateUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {};

  async execute(id: string, dto: UpdateUserUseCaseDto) {
    const findingUser = await this.userRepo.findById(id);
    if(!findingUser) throw new NotFoundError('User not found.');

    findingUser.update(dto);

    await this.userRepo.update(id, findingUser);
  };
}