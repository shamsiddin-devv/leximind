import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { DatabasePool } from '../db/drizzle/drizzle.provider';
import {
  AccountSession,
  IAuthRepository,
  Identity,
} from '../../domain/repositories/IAuthRepository';
import { ITokenService } from '../../domain/services/ITokenService';
export class SecureTokenService implements ITokenService {
  generate() {
    return randomBytes(32).toString('base64url');
  }
  digest(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private readonly pool: DatabasePool) {}
  async create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    expectedPasswordHash: string,
    userAgent?: string,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Password changes lock the same user row before revoking sessions.
      const current = await client.query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id=$1 FOR UPDATE',
        [userId],
      );
      if (current.rows[0]?.password_hash !== expectedPasswordHash) {
        await client.query('ROLLBACK');
        return false;
      }
      await client.query(
        'INSERT INTO auth_sessions(user_id,token_hash,expires_at,user_agent) VALUES($1,$2,$3,$4)',
        [userId, tokenHash, expiresAt, userAgent?.trim().slice(0, 512) || null],
      );
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async resolve(tokenHash: string) {
    const { rows } = await this.pool.query<Identity>(
      'SELECT u.id,u.role,s.id AS "sessionId" FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',
      [tokenHash],
    );
    return rows[0] ?? null;
  }
  async list(userId: string) {
    const { rows } = await this.pool.query<AccountSession>(
      `SELECT id,user_agent AS "userAgent",created_at AS "createdAt",expires_at AS "expiresAt"
       FROM auth_sessions WHERE user_id=$1 AND expires_at>now() ORDER BY created_at DESC,id`,
      [userId],
    );
    return rows;
  }
  async revoke(sessionId: string, userId: string) {
    await this.pool.query(
      'DELETE FROM auth_sessions WHERE id=$1 AND user_id=$2',
      [sessionId, userId],
    );
  }
  async revokeOthers(userId: string, currentSessionId: string) {
    await this.pool.query(
      'DELETE FROM auth_sessions WHERE user_id=$1 AND id<>$2',
      [userId, currentSessionId],
    );
  }
}
