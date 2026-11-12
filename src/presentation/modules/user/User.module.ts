import { Module } from '@nestjs/common';
import { UserController } from './User.controller';
import { CreateUserUseCase } from 'src/application/use-cases/user/CreateUserUseCase';
import { IUserRepository } from 'src/domain/repositories/IUserRepository';
import { IHashService } from 'src/domain/services/IHashService';
import { GetUserByIdUseCase } from 'src/application/use-cases/user/GetUserByIdUseCase';
import { GetUserByEmailUseCase } from 'src/application/use-cases/user/GetUserByEmailUseCase';
import { GetUsersUseCase } from 'src/application/use-cases/user/GetUsersUseCase';
import { UpdateUserUseCase } from 'src/application/use-cases/user/UpdateUserUseCase';
import { DeleteUserUseCase } from 'src/application/use-cases/user/DeleteUserUseCase';
import { ChangePasswordUseCase } from 'src/application/use-cases/user/ChangePasswordUseCase';

@Module({
  controllers: [UserController],
  providers: [
    {
      provide: CreateUserUseCase,
      useFactory: (userRepo: IUserRepository, hashService: IHashService) =>
        new CreateUserUseCase(userRepo, hashService),
      inject: ['IUserRepository', 'IHashService'],
    },
    {
      provide: GetUserByIdUseCase,
      useFactory: (userRepo: IUserRepository) =>
        new GetUserByIdUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: GetUserByEmailUseCase,
      useFactory: (userRepo: IUserRepository) =>
        new GetUserByEmailUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: GetUsersUseCase,
      useFactory: (userRepo: IUserRepository) =>
        new GetUsersUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: UpdateUserUseCase,
      useFactory: (userRepo: IUserRepository) =>
        new UpdateUserUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: DeleteUserUseCase,
      useFactory: (userRepo: IUserRepository) =>
        new UpdateUserUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: ChangePasswordUseCase,
      useFactory: (userRepo: IUserRepository, hashService: IHashService) =>
        new ChangePasswordUseCase(userRepo, hashService),
      inject: ['IUserRepository', 'IHashService'],
    },
  ],
})
export class UserModule {}
