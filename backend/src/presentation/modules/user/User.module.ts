import { Module } from '@nestjs/common';
import { UserController } from './User.controller';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IHashService } from '../../../domain/services/IHashService';
import { GetUserByIdUseCase } from '../../../application/use-cases/user/GetUserByIdUseCase';
import { GetUsersUseCase } from '../../../application/use-cases/user/GetUsersUseCase';
import { UpdateUserUseCase } from '../../../application/use-cases/user/UpdateUserUseCase';
import { DeleteUserUseCase } from '../../../application/use-cases/user/DeleteUserUseCase';
import { ChangePasswordUseCase } from '../../../application/use-cases/user/ChangePasswordUseCase';
import { GetSharedProfile } from '../../../application/use-cases/user/GetSharedProfile';
import { LearningUseCases } from '../../../application/use-cases/LearningUseCases';
import { LearningModule } from '../learning/learning.module';

import { UpdateAvatarUseCase } from '../../../application/use-cases/user/UpdateAvatarUseCase';
import { CloudinaryAvatarStorage } from '../../../infrastructure/media/CloudinaryAvatarStorage';

@Module({
  imports: [LearningModule],
  controllers: [UserController],
  providers: [
    CloudinaryAvatarStorage,
    {
      provide: GetSharedProfile,
      useFactory: (users: IUserRepository, learning: LearningUseCases) => new GetSharedProfile(users, learning),
      inject: ['IUserRepository', LearningUseCases],
    },
    {
      provide: UpdateAvatarUseCase,
      useFactory: (users: IUserRepository, storage: CloudinaryAvatarStorage) =>
        new UpdateAvatarUseCase(users, storage),
      inject: ['IUserRepository', CloudinaryAvatarStorage],
    },
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
      useFactory: (userRepo: IUserRepository, hashService: IHashService) =>
        new UpdateUserUseCase(userRepo, hashService),
      inject: ['IUserRepository', 'IHashService'],
    },
    {
      provide: DeleteUserUseCase,
      useFactory: (users: IUserRepository, hash: IHashService, storage: CloudinaryAvatarStorage) =>
        new DeleteUserUseCase(users, hash, storage),
      inject: ['IUserRepository', 'IHashService', CloudinaryAvatarStorage],
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
