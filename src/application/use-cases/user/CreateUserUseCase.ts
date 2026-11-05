import { CreateUserUseCaseDto } from "src/application/dto/user/CreateUserUseCaseDto";
import { User } from "src/domain/entities/User";
import { ConflictError } from "src/domain/errors/ConflictError";
import { IUserRepository } from "src/domain/repositories/IUserRepository";
import { IHashService } from "src/domain/services/IHashService";
import { Email } from "src/domain/value-objects/Email";

export class CreateUserUseCase {
  constructor(private readonly userRepo: IUserRepository, private readonly hashService: IHashService) {};

  async execute(dto: CreateUserUseCaseDto) {
    const checkingEmail = new Email(dto.email);
    const findingUser = await this.userRepo.findByEmail(checkingEmail.toString());

    if(findingUser) throw new ConflictError('User already exist.');
    const hashPassword = await this.hashService.hash(dto.password);

    const user = new User({
      fullName: dto.fullName,
      email: checkingEmail
    })

    const row = await this.userRepo.create(user, hashPassword);
    return row;
  };
}