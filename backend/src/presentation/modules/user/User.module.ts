import { Module } from '@nestjs/common';
import { UserController } from './User.controller';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IHashService } from '../../../domain/services/IHashService';
import { GetUserByIdUseCase } from '../../../application/use-cases/user/GetUserByIdUseCase';
import { GetUsersUseCase } from '../../../application/use-cases/user/GetUsersUseCase';
import { UpdateUserUseCase } from '../../../application/use-cases/user/UpdateUserUseCase';
import { DeleteUserUseCase } from '../../../application/use-cases/user/DeleteUserUseCase';
import { ChangePasswordUseCase } from '../../../application/use-cases/user/ChangePasswordUseCase';

@Module({
  controllers: [UserController],
  providers: [
    {
      provide: GetUserByIdUseCase,
      useFactory: (userRepo: IUserRepository) =>
        new GetUserByIdUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: GetUsersUseCase,
      useFactory: (userRepo: IUserRepository) => new GetUsersUseCase(userRepo),
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
        new DeleteUserUseCase(userRepo),
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
