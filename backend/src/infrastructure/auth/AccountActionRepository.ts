import { Injectable } from '@nestjs/common';
import type {
  AccountActionKind,
  AccountActionStore,
} from '../../application/use-cases/user/AccountActions';
import { DatabasePool } from '../db/drizzle/drizzle.provider';

@Injectable()
export class AccountActionRepository implements AccountActionStore {
  constructor(private readonly pool: DatabasePool) {}

  async issue(
    userId: string,
    email: string,
    kind: AccountActionKind,
    digest: string,
    expires: Date,
    encryptedToken: string,
  ) {
    await this.pool.query(
      `INSERT INTO account_actions(token_hash,user_id,email,kind,expires_at,encrypted_token)
       SELECT $4,id,email,$3,$5,$6 FROM users WHERE id=$1 AND email=$2
         AND ($3 <> 'verify_email' OR email_verified_at IS NULL)
       FOR UPDATE`,
      [userId, email, kind, digest, expires, encryptedToken],
    );
  }

  async claimEmail() {
    const { rows } = await this.pool.query<{
      digest: string;
      email: string;
      kind: AccountActionKind;
      encryptedToken: string;
    }>(
      `WITH pending AS (
         SELECT a.token_hash FROM account_actions a JOIN users u ON u.id=a.user_id AND u.email=a.email
         WHERE a.encrypted_token IS NOT NULL AND a.expires_at>now() AND a.deliver_after<=now()
           AND a.delivery_attempts<6
         ORDER BY a.deliver_after,a.token_hash LIMIT 1 FOR UPDATE OF a SKIP LOCKED
       )
       UPDATE account_actions a SET delivery_attempts=a.delivery_attempts+1,
         deliver_after=now()+interval '1 minute' * (a.delivery_attempts+1)
       FROM pending WHERE a.token_hash=pending.token_hash
       RETURNING a.token_hash AS digest,a.email,a.kind,a.encrypted_token AS "encryptedToken"`,
    );
    return rows[0] ?? null;
  }

  async delivered(digest: string) {
    await this.pool.query(
      'UPDATE account_actions SET encrypted_token=NULL WHERE token_hash=$1',
      [digest],
    );
  }

  async consume(
    digest: string,
    kind: AccountActionKind,
    passwordHash?: string,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query<{ id: string }>(
        `SELECT u.id FROM users u JOIN account_actions a ON a.user_id=u.id
         WHERE a.token_hash=$1 AND a.kind=$2 AND a.email=u.email
         AND a.expires_at>clock_timestamp() FOR UPDATE OF u`,
        [digest, kind],
      );
      const userId = locked.rows[0]?.id;
      const consumed =
        userId &&
        (await client.query(
          'DELETE FROM account_actions WHERE token_hash=$1 AND expires_at>clock_timestamp() RETURNING token_hash',
          [digest],
        ));
      if (!userId || !consumed || !consumed.rowCount) {
        await client.query('ROLLBACK');
        return false;
      }
      if (kind === 'verify_email') {
        await client.query(
          'UPDATE users SET email_verified_at=now(),updated_at=now() WHERE id=$1',
          [userId],
        );
        await client.query(
          "DELETE FROM account_actions WHERE user_id=$1 AND kind='verify_email'",
          [userId],
        );
      } else {
        await client.query(
          'UPDATE users SET password_hash=$2,updated_at=now() WHERE id=$1',
          [userId, passwordHash],
        );
        await client.query('DELETE FROM auth_sessions WHERE user_id=$1', [
          userId,
        ]);
        await client.query(
          "DELETE FROM account_actions WHERE user_id=$1 AND kind='reset_password'",
          [userId],
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
