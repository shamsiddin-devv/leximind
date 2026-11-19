import type { IAuthRepository, Identity } from '../../../domain/repositories/IAuthRepository';

export class AccountSessions {
  constructor(private readonly sessions: IAuthRepository) {}

  async list(user: Identity) {
    const sessions = await this.sessions.list(user.id);
    return sessions.map((session) => ({ ...session, current: session.id === user.sessionId }));
  }

  revoke(user: Identity, sessionId: string) {
    return this.sessions.revoke(sessionId, user.id);
  }

  revokeOthers(user: Identity) {
    return this.sessions.revokeOthers(user.id, user.sessionId);
  }
}
