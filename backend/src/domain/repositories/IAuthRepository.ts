export interface Identity {
  id: string;
  role: 'user' | 'admin';
  sessionId: string;
}
export type AccountSession = {
  id: string;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
};

export interface IAuthRepository {
  create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    expectedPasswordHash: string,
    userAgent?: string,
  ): Promise<boolean>;
  resolve(tokenHash: string): Promise<Identity | null>;
  list(userId: string): Promise<AccountSession[]>;
  revoke(sessionId: string, userId: string): Promise<void>;
  revokeOthers(userId: string, currentSessionId: string): Promise<void>;
}
export const AUTH_REPOSITORY = Symbol('AuthRepository');
