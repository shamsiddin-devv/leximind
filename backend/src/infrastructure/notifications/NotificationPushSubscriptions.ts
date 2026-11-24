import { Injectable } from '@nestjs/common';
import type { Identity } from '../../domain/repositories/IAuthRepository';
import { ConflictError } from '../../domain/errors/ConflictError';
import { DatabasePool } from '../db/drizzle/drizzle.provider';
import type { BrowserPushSubscription } from './push-configuration';

@Injectable()
export class NotificationPushSubscriptions {
  constructor(private readonly pool: DatabasePool) {}

  async listDeviceIds(user: Identity) {
    const { rows } = await this.pool.query<{ id: string }>(
      'SELECT id FROM notification_push_subscriptions WHERE user_id=$1 AND session_id=$2',
      [user.id, user.sessionId],
    );
    return rows.map(({ id }) => id);
  }

  async register(user: Identity, subscription: BrowserPushSubscription) {
    const { endpoint, keys } = subscription;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended('push-endpoint:' || $1::text, 0))",
        [endpoint],
      );
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended('push-owner:' || $1::text, 0))",
        [user.id],
      );
      const {
        rows: [saved],
      } = await client.query<{
        id: string;
        userId: string;
        p256dh: string;
        auth: string;
      }>(
        `SELECT id, user_id AS "userId", p256dh, auth_secret AS auth
         FROM notification_push_subscriptions WHERE endpoint=$1 FOR UPDATE`,
        [endpoint],
      );

      let id: string;
      if (saved?.userId === user.id) {
        await client.query(
          'UPDATE notification_push_subscriptions SET session_id=$2,p256dh=$3,auth_secret=$4 WHERE id=$1',
          [saved.id, user.sessionId, keys.p256dh, keys.auth],
        );
        id = saved.id;
      } else {
        const {
          rows: [active],
        } = await client.query<{ count: number }>(
          `SELECT count(*)::integer AS count FROM notification_push_subscriptions p
           JOIN auth_sessions s ON s.id=p.session_id WHERE p.user_id=$1 AND s.expires_at>now()`,
          [user.id],
        );
        if (active.count >= 8)
          throw new ConflictError('Active push device limit reached.');
        if (saved) {
          if (saved.p256dh !== keys.p256dh || saved.auth !== keys.auth)
            throw new ConflictError('Push subscription keys changed.');
          await client.query(
            'DELETE FROM notification_push_subscriptions WHERE id=$1',
            [saved.id],
          );
        }
        const {
          rows: [created],
        } = await client.query<{ id: string }>(
          `INSERT INTO notification_push_subscriptions (user_id,session_id,endpoint,p256dh,auth_secret)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [user.id, user.sessionId, endpoint, keys.p256dh, keys.auth],
        );
        id = created.id;
      }
      await client.query('COMMIT');
      return { id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(userId: string, id: string) {
    await this.pool.query(
      'DELETE FROM notification_push_subscriptions WHERE id=$1 AND user_id=$2',
      [id, userId],
    );
  }
}
