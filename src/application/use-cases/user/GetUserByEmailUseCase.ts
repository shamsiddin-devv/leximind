import { NotFoundError } from 'src/domain/errors/NotFoundError';
import { IUserRepository } from 'src/domain/repositories/IUserRepository';
import { Email } from 'src/domain/value-objects/Email';

export class GetUserByEmailUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string) {
    const checkingEmail = new Email(email);

    const row = await this.userRepo.findByEmail(checkingEmail.toString());

    if (!row) throw new NotFoundError('User not found.');

    return row;
  }
}
