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

  async execute(dto: CreateUserUseCaseDto) {
    validatePassword(dto.password);
    const checkingEmail = new Email(dto.email);
    const findingUser = await this.userRepo.findByEmail(
      checkingEmail.toString(),
    );

    if (findingUser) throw new ConflictError('User already exist.');
    const hashPassword = await this.hashService.hash(dto.password);

    const user = new User({
      fullName: dto.fullName,
      email: checkingEmail,
    });

    const row = await this.userRepo.create(
      user,
      hashPassword,
      {
        studyLevel: dto.studyLevel,
        dailyStudyMinutes: dto.dailyStudyMinutes,
        dailyNewWords: dto.dailyNewWords,
      },
      dto.referralCode,
    );
    return row;
  }
}
