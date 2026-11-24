import { Injectable } from '@nestjs/common';
import type {
  INotificationRepository,
  NotificationPage,
} from '../../domain/repositories/INotificationRepository';
import { DatabasePool } from '../db/drizzle/drizzle.provider';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly pool: DatabasePool) {}

  async list(userId: string, page: number, limit: number) {
    const {
      rows: [result],
    } = await this.pool.query<NotificationPage>(
      `WITH visible AS (
         SELECT id, type, data, created_at AS "createdAt", read_at AS "readAt"
         FROM user_notifications WHERE user_id=$1 AND type NOT IN ('friend_request','friend_accepted')
       ), items AS (
         SELECT * FROM visible ORDER BY "createdAt" DESC, id DESC LIMIT $2 OFFSET $3
       )
       SELECT coalesce((SELECT jsonb_agg(to_jsonb(items) ORDER BY "createdAt" DESC,id DESC) FROM items),'[]') AS data,
         (SELECT count(*)::integer FROM visible) AS total,
         (SELECT count(*)::integer FROM visible WHERE "readAt" IS NULL) AS "unreadCount"`,
      [userId, limit, (page - 1) * limit],
    );
    return result;
  }

  async markRead(userId: string, id: string) {
    await this.pool.query(
      'UPDATE user_notifications SET read_at=now() WHERE user_id=$1 AND id=$2 AND read_at IS NULL',
      [userId, id],
    );
  }

  async markAllRead(userId: string) {
    await this.pool.query(
      'UPDATE user_notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL',
      [userId],
    );
  }
}
