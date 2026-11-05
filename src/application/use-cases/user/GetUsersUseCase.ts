import { IUserRepository } from "src/domain/repositories/IUserRepository";

export class GetUsersUseCase {
  constructor(private readonly userRepo: IUserRepository) {};

  async execute() {
    return this.userRepo.findAll();
  };
};