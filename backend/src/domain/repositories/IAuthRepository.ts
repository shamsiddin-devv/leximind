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
export type SessionRefresh = { tokenHash: string; accessExpiresAt: Date };

export interface IAuthRepository {
  create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    expectedPasswordHash: string,
    userAgent?: string,
    refresh?: SessionRefresh,
  ): Promise<string | null>;
  rotateRefresh(
    currentHash: string,
    accessHash: string,
    refresh: SessionRefresh,
  ): Promise<{ id: string; expiresAt: Date; accessExpiresAt: Date } | null>;
  resolve(tokenHash: string): Promise<Identity | null>;
  list(userId: string): Promise<AccountSession[]>;
  revoke(sessionId: string, userId: string): Promise<void>;
  revokeOthers(userId: string, currentSessionId: string): Promise<void>;
}
export const AUTH_REPOSITORY = Symbol('AuthRepository');
