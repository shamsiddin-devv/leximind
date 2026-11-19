import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthRepository,
  SecureTokenService,
} from '../../../infrastructure/auth/AuthRepository';
import { BcryptHash } from '../../../infrastructure/auth/BcryptHash';
import { LoginUseCase } from '../../../application/use-cases/user/LoginUseCase';
import { LogoutUseCase } from '../../../application/use-cases/user/LogoutUseCase';
import { CreateUserUseCase } from '../../../application/use-cases/user/CreateUserUseCase';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '../../../domain/repositories/IAuthRepository';
import { TOKEN_SERVICE } from '../../../domain/services/ITokenService';
import { AuthController } from './auth.controller';
import { AccountSessions } from '../../../application/use-cases/user/AccountSessions';
import { AccountActions } from '../../../application/use-cases/user/AccountActions';
import { AccountActionRepository } from '../../../infrastructure/auth/AccountActionRepository';
import { AccountActionMailer } from '../../../infrastructure/auth/AccountActionMailer';
import { AccountEmailWorker } from '../../../infrastructure/auth/AccountEmailWorker';
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AccountActionRepository,
    AccountActionMailer,
    AccountEmailWorker,
    {
      provide: AccountSessions,
      useFactory: (sessions: IAuthRepository) => new AccountSessions(sessions),
      inject: [AUTH_REPOSITORY],
    },
    {
      provide: AccountActions,
      useFactory: (
        users: IUserRepository,
        actions: AccountActionRepository,
        mailer: AccountActionMailer,
        tokens: SecureTokenService,
        hashes: BcryptHash,
      ) => new AccountActions(users, actions, mailer, tokens, hashes),
      inject: [
        'IUserRepository',
        AccountActionRepository,
        AccountActionMailer,
        SecureTokenService,
        BcryptHash,
      ],
    },
    AuthRepository,
    SecureTokenService,
    BcryptHash,
    { provide: AUTH_REPOSITORY, useExisting: AuthRepository },
    { provide: TOKEN_SERVICE, useExisting: SecureTokenService },
    { provide: 'IHashService', useExisting: BcryptHash },
    {
      provide: LogoutUseCase,
      useFactory: (sessions: IAuthRepository) => new LogoutUseCase(sessions),
      inject: [AUTH_REPOSITORY],
    },
    {
      provide: LoginUseCase,
      useFactory: async (
        u: IUserRepository,
        s: AuthRepository,
        h: BcryptHash,
        t: SecureTokenService,
        c: ConfigService,
      ) =>
        new LoginUseCase(
          u,
          s,
          h,
          t,
          c.getOrThrow<number>('AUTH_TTL_SECONDS'),
          await h.hash(t.generate()),
        ),
      inject: [
        'IUserRepository',
        AuthRepository,
        BcryptHash,
        SecureTokenService,
        ConfigService,
      ],
    },
    {
      provide: CreateUserUseCase,
      useFactory: (u: IUserRepository, h: BcryptHash) =>
        new CreateUserUseCase(u, h),
      inject: ['IUserRepository', BcryptHash],
    },
  ],
  exports: [AUTH_REPOSITORY, TOKEN_SERVICE, 'IHashService'],
})
export class AuthModule {}
