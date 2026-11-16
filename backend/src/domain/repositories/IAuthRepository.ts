export interface Identity {
  id: string;
  role: 'user' | 'admin';
  sessionId: string;
}
export interface IAuthRepository {
  create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    expectedPasswordHash: string,
  ): Promise<boolean>;
  resolve(tokenHash: string): Promise<Identity | null>;
  revoke(sessionId: string, userId: string): Promise<void>;
}
export const AUTH_REPOSITORY = Symbol('AuthRepository');
