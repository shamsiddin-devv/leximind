import type { UpdateUserUseCaseDto } from '../../dto/user/UpdateUserUseCaseDto';
import { BadRequestError } from '../../../domain/errors/BadRequestError';
import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { IHashService } from '../../../domain/services/IHashService';
import { Email } from '../../../domain/value-objects/Email';

export class UpdateUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hashes: IHashService,
  ) {}

  execute(id: string, { currentPassword, ...details }: UpdateUserUseCaseDto) {
    const email =
      details.email === undefined ? undefined : new Email(details.email);
    return this.users.edit(id, async (user, passwordHash) => {
      if (email && !user.email.equals(email)) {
        if (
          !currentPassword ||
          !(await this.hashes.compare(currentPassword, passwordHash))
        ) {
          throw new BadRequestError('Current password is incorrect.');
        }
      }
      user.update(details);
    });
  }
}
