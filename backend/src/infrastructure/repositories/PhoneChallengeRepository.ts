import { Injectable } from '@nestjs/common';
import type { PhoneChallengeStore } from '../../application/use-cases/user/VerifyProfilePhone';
import { DatabasePool } from '../db/drizzle/drizzle.provider';

@Injectable()
export class PhoneChallengeRepository implements PhoneChallengeStore {
  constructor(private readonly pool: DatabasePool) {}

  async start(userId: string, phone: string, startHash: string) {
    await this.pool.query(
      'DELETE FROM phone_verification_challenges WHERE expires_at <= now()',
    );
    const result = await this.pool.query(
      `INSERT INTO phone_verification_challenges (user_id, phone_number, start_hash, expires_at)
       VALUES ($1, $2, $3, now() + interval '10 minutes')
       ON CONFLICT (user_id) DO UPDATE
       SET phone_number = excluded.phone_number, start_hash = excluded.start_hash,
           expires_at = excluded.expires_at, created_at = now(), chat_id = NULL,
           start_update_id = NULL, contact_update_id = NULL, failed_attempts = 0
       WHERE phone_verification_challenges.created_at <= now() - interval '1 minute'`,
      [userId, phone, startHash],
    );
    return result.rowCount === 1;
  }

  async link(startHash: string, chatId: number, updateId: number) {
    const result = await this.pool.query(
      `UPDATE phone_verification_challenges
       SET chat_id = $2, start_update_id = $3
       WHERE start_hash = $1 AND expires_at > now() AND contact_update_id IS NULL
         AND (chat_id IS NULL OR chat_id = $2 AND start_update_id <= $3)`,
      [startHash, chatId, updateId],
    );
    return result.rowCount === 1;
  }

  async acceptContact(chatId: number, phone: string, updateId: number) {
    const result = await this.pool.query<{ start_hash: string }>(
      `UPDATE phone_verification_challenges
       SET contact_update_id = $3
       WHERE start_hash = (
         SELECT start_hash FROM phone_verification_challenges
         WHERE chat_id = $1 AND expires_at > now()
         ORDER BY start_update_id DESC LIMIT 1
       )
       AND phone_number = $2 AND start_update_id < $3
       AND (contact_update_id IS NULL OR contact_update_id = $3)
       RETURNING start_hash`,
      [chatId, phone, updateId],
    );
    return result.rows[0]?.start_hash ?? null;
  }

  async confirm(userId: string, isCorrect: (startHash: string) => boolean) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const user = await client.query(
        'SELECT id FROM users WHERE id = $1 FOR UPDATE',
        [userId],
      );
      const {
        rows: [challenge],
      } = await client.query<{ start_hash: string; phone_number: string }>(
        `SELECT start_hash, phone_number FROM phone_verification_challenges
         WHERE user_id = $1 AND expires_at > clock_timestamp()
           AND contact_update_id IS NOT NULL AND failed_attempts < 5 FOR UPDATE`,
        [userId],
      );
      let verified = false;
      if (user.rowCount && challenge) {
        verified = isCorrect(challenge.start_hash);
        if (verified) {
          await client.query(
            'UPDATE users SET phone_number = $2, phone_verified_at = now() WHERE id = $1',
            [userId, challenge.phone_number],
          );
          await client.query(
            'DELETE FROM phone_verification_challenges WHERE user_id = $1',
            [userId],
          );
        } else {
          await client.query(
            'UPDATE phone_verification_challenges SET failed_attempts = failed_attempts + 1 WHERE user_id = $1',
            [userId],
          );
        }
      }
      await client.query('COMMIT');
      return verified;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
