import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  AccountActionKind,
  AccountActionStore,
} from '../../application/use-cases/user/AccountActions';
import { DatabasePool } from '../db/drizzle/drizzle.provider';

const maxCodeAttempts = 5;

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
    codeDigest: string,
  ) {
    await this.transaction(async (client) => {
      const user = await client.query(
        `SELECT id FROM users WHERE id=$1 AND email=$2
         AND ($3 <> 'verify_email' OR email_verified_at IS NULL)
         FOR UPDATE`,
        [userId, email, kind],
      );
      if (!user.rowCount) return;

      const {
        rows: [previous],
      } = await client.query<{
        attempts: number;
        usable: boolean;
        coolingDown: boolean;
      }>(
        `SELECT otp_attempts AS attempts, otp_expires_at > clock_timestamp() AS usable,
           otp_expires_at > clock_timestamp() + interval '9 minutes' AS "coolingDown"
         FROM account_actions WHERE user_id=$1 AND kind=$2 AND otp_hash IS NOT NULL`,
        [userId, kind],
      );
      const attempts = previous?.usable ? previous.attempts : 0;
      if (previous?.coolingDown || attempts >= maxCodeAttempts) return;

      await client.query(
        `UPDATE account_actions SET otp_hash=NULL, otp_expires_at=NULL, otp_attempts=0, encrypted_token=NULL
         WHERE user_id=$1 AND kind=$2 AND otp_hash IS NOT NULL`,
        [userId, kind],
      );
      await client.query(
        `INSERT INTO account_actions(token_hash,user_id,email,kind,expires_at,encrypted_token,otp_hash,otp_expires_at,otp_attempts)
         VALUES ($1,$2,$3,$4,$5,$6,$7,least($5::timestamptz,clock_timestamp()+interval '10 minutes'),$8)`,
        [
          digest,
          userId,
          email,
          kind,
          expires,
          encryptedToken,
          codeDigest,
          attempts,
        ],
      );
    });
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
    return this.transaction(async (client) => {
      const locked = await client.query<{ id: string }>(
        `SELECT u.id FROM users u JOIN account_actions a ON a.user_id=u.id
         WHERE a.token_hash=$1 AND a.kind=$2 AND a.email=u.email
         AND a.expires_at>clock_timestamp() FOR UPDATE OF u`,
        [digest, kind],
      );
      const userId = locked.rows[0]?.id;
      if (!userId) return false;
      const consumed = await client.query(
        'DELETE FROM account_actions WHERE token_hash=$1 AND expires_at>clock_timestamp()',
        [digest],
      );
      if (!consumed.rowCount) return false;
      await this.applyAction(client, userId, kind, passwordHash);
      return true;
    });
  }

  async consumeCode(
    email: string,
    kind: AccountActionKind,
    digest: string,
    hashPassword?: () => Promise<string>,
  ) {
    return this.transaction(async (client) => {
      const {
        rows: [user],
      } = await client.query<{ id: string }>(
        'SELECT id FROM users WHERE email=$1 FOR UPDATE',
        [email],
      );
      if (!user) return false;
      const {
        rows: [code],
      } = await client.query<{ digest: string; attempts: number }>(
        `SELECT otp_hash AS digest,otp_attempts AS attempts
         FROM account_actions WHERE user_id=$1 AND email=$2 AND kind=$3
         AND otp_hash IS NOT NULL AND otp_expires_at>clock_timestamp()
         AND expires_at>clock_timestamp()`,
        [user.id, email, kind],
      );
      if (!code || code.attempts >= maxCodeAttempts) return false;
      if (
        !timingSafeEqual(
          Buffer.from(code.digest, 'hex'),
          Buffer.from(digest, 'hex'),
        )
      ) {
        await client.query(
          'UPDATE account_actions SET otp_attempts=otp_attempts+1 WHERE user_id=$1 AND kind=$2 AND otp_hash IS NOT NULL',
          [user.id, kind],
        );
        return false;
      }
      await this.applyAction(client, user.id, kind, await hashPassword?.());
      return true;
    });
  }

  private async applyAction(
    client: PoolClient,
    userId: string,
    kind: AccountActionKind,
    passwordHash?: string,
  ) {
    if (kind === 'verify_email') {
      await client.query(
        'UPDATE users SET email_verified_at=now(),updated_at=now() WHERE id=$1',
        [userId],
      );
      await client.query(
        'UPDATE referrals SET rewarded_at=now() WHERE referred_user_id=$1 AND rewarded_at IS NULL',
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
    }
    await client.query(
      'DELETE FROM account_actions WHERE user_id=$1 AND kind=$2',
      [userId, kind],
    );
  }

  private async transaction<T>(run: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const value = await run(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
