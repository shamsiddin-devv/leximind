import type {
  IAuthRepository,
  Identity,
} from '../../../domain/repositories/IAuthRepository';

export class LogoutUseCase {
  constructor(private readonly sessions: IAuthRepository) {}

  execute(identity: Identity) {
    return this.sessions.revoke(identity.sessionId, identity.id);
  }
}
