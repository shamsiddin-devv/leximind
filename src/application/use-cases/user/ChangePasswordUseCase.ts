import { validatePassword } from '../../../domain/value-objects/PasswordPolicy';
import { ChangePasswordUseCaseDto } from '../../dto/user/ChangePasswordUseCaseDto';
import { BadRequestError } from '../../../domain/errors/BadRequestError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IHashService } from '../../../domain/services/IHashService';

export class ChangePasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(id: string, dto: ChangePasswordUseCaseDto) {
    validatePassword(dto.newPassword);
    const checkingUser = await this.userRepo.findById(id);
    if (!checkingUser) throw new NotFoundError('User not found.');

    const oldPassword = await this.userRepo.findPasswordHashByUserId(id);
    const comparePassword =
      oldPassword &&
      (await this.hashService.compare(dto.currentPassword, oldPassword));
    if (!oldPassword || !comparePassword)
      throw new BadRequestError('Current password is incorrect.');

    const hashPassword = await this.hashService.hash(dto.newPassword);
    const changed = await this.userRepo.updateHashPassword(
      id,
      hashPassword,
      oldPassword,
    );
    if (!changed)
      throw new BadRequestError(
        'Password changed concurrently; sign in again.',
      );

    return { success: true };
  }
}
