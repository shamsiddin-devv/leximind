import { BadRequestError } from '../../../domain/errors/BadRequestError';
import type { RegistrationEmailProof } from '../../../domain/repositories/IUserRepository';
import { validatePassword } from '../../../domain/value-objects/PasswordPolicy';
import { CreateUserUseCaseDto } from '../../dto/user/CreateUserUseCaseDto';
import { User } from '../../../domain/entities/User';
import { ConflictError } from '../../../domain/errors/ConflictError';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IHashService } from '../../../domain/services/IHashService';
import { Email } from '../../../domain/value-objects/Email';

export class CreateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(dto: CreateUserUseCaseDto, proof: RegistrationEmailProof) {
    validatePassword(dto.password);
    const checkingEmail = new Email(dto.email);
    const findingUser = await this.userRepo.findByEmail(
      checkingEmail.toString(),
    );

    if (findingUser) throw new ConflictError('User already exist.');

    const user = new User({
      fullName: dto.fullName,
      email: checkingEmail,
    });

    const row = await this.userRepo.create(
      user,
      () => this.hashService.hash(dto.password),
      proof,
      {
        studyLevel: dto.studyLevel,
        dailyStudyMinutes: dto.dailyStudyMinutes,
        dailyNewWords: dto.dailyNewWords,
      },
      dto.referralCode,
    );
    if (!row)
      throw new BadRequestError('Invalid or expired registration code.');
    return row;
  }
}
