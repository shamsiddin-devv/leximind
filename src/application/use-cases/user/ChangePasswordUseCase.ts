import { ChangePasswordUseCaseDto } from "src/application/dto/user/ChangePasswordUseCaseDto";
import { BadRequestError } from "src/domain/errors/BadRequestError";
import { NotFoundError } from "src/domain/errors/NotFoundError";
import { IUserRepository } from "src/domain/repositories/IUserRepository";
import { IHashService } from "src/domain/services/IHashService";

export class ChangePasswordUseCase {
  constructor(private readonly userRepo: IUserRepository, private readonly hashService: IHashService) {};

  async execute(id: string, dto: ChangePasswordUseCaseDto) {
    const checkingUser = await this.userRepo.findById(id);
    if(!checkingUser) throw new NotFoundError('User not found.');

    const oldPassword = await this.userRepo.findPasswordHashByUserId(id);
    const comparePassword = await this.hashService.compare(dto.currentPassword, oldPassword!);
    if(!comparePassword) throw new BadRequestError('Current password is incorrect.');

    const hashPassword = await this.hashService.hash(dto.newPassword);
    await this.userRepo.updateHashPassword(id, hashPassword);

    return {success: true};
  };
}