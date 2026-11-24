import { Module } from '@nestjs/common';
import { UserUiPreferencesController } from './user-ui-preferences.controller';
import { UserUiPreferences } from '../../../application/use-cases/user/UserUiPreferences';
import { DrizzleUserUiPreferenceRepository } from '../../../infrastructure/repositories/DrizzleUserUiPreferenceRepository';
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
import { ReferralsController } from './referrals.controller';
import { GetReferrals } from '../../../application/use-cases/user/GetReferrals';
import { ReferralRepository } from '../../../infrastructure/repositories/ReferralRepository';

import { UpdateAvatarUseCase } from '../../../application/use-cases/user/UpdateAvatarUseCase';
import { CloudinaryAvatarStorage } from '../../../infrastructure/media/CloudinaryAvatarStorage';
import { AvatarCleanupQueue } from '../../../infrastructure/media/AvatarCleanupQueue';
import { AvatarCleanupWorker } from '../../../infrastructure/media/AvatarCleanupWorker';

@Module({
  imports: [LearningModule],
  controllers: [
    UserController,
    UserUiPreferencesController,
    ReferralsController,
  ],
  providers: [
    ReferralRepository,
    {
      provide: GetReferrals,
      useFactory: (referrals: ReferralRepository) =>
        new GetReferrals(referrals),
      inject: [ReferralRepository],
    },
    CloudinaryAvatarStorage,
    AvatarCleanupQueue,
    AvatarCleanupWorker,
    DrizzleUserUiPreferenceRepository,
    {
      provide: UserUiPreferences,
      useFactory: (
        preferences: DrizzleUserUiPreferenceRepository,
        storage: CloudinaryAvatarStorage,
      ) =>
        new UserUiPreferences(preferences, (image) =>
          storage.uploadBanner(image),
        ),
      inject: [DrizzleUserUiPreferenceRepository, CloudinaryAvatarStorage],
    },
    {
      provide: GetSharedProfile,
      useFactory: (
        users: IUserRepository,
        learning: LearningUseCases,
        preferences: DrizzleUserUiPreferenceRepository,
      ) => new GetSharedProfile(users, preferences, learning),
      inject: [
        'IUserRepository',
        LearningUseCases,
        DrizzleUserUiPreferenceRepository,
      ],
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
      useFactory: (users: IUserRepository, hash: IHashService) =>
        new DeleteUserUseCase(users, hash),
      inject: ['IUserRepository', 'IHashService'],
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
