import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NotificationData } from '../../domain/repositories/INotificationRepository';
import { DatabasePool } from '../db/drizzle/drizzle.provider';

export type DeliveryChannel = 'push' | 'email';
export type DeliveryOutcome = 'delivered' | 'skipped' | 'failed';
export interface DeliveryJob {
  id: string;
  notificationId: string;
  channel: DeliveryChannel;
  attempts: number;
  leaseId: string;
  expiresAt: Date;
}
export interface DeliveryTarget {
  userId: string;
  type: string;
  data: NotificationData;
  email: string;
  subscriptionId: string | null;
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
}

const eventEnabled = `((n.type='daily' AND l.study_reminder_enabled)
  OR (n.type IN ('review','streak','achievements','progress','weekly') AND p.notifications->>n.type='true'))`;

@Injectable()
export class NotificationDeliveryRepository {
  constructor(private readonly pool: DatabasePool) {}

  async enqueue(channels: DeliveryChannel[]) {
    if (channels.includes('push')) {
      await this.pool.query(
        `INSERT INTO notification_delivery_jobs(notification_id,subscription_id,channel,expires_at)
         SELECT n.id,s.id,'push',n.created_at+interval '1 hour'
         FROM user_notifications n
         JOIN notification_push_subscriptions s ON s.user_id=n.user_id AND s.created_at<=n.created_at
         JOIN auth_sessions a ON a.id=s.session_id AND a.user_id=s.user_id AND a.expires_at>now()
         JOIN user_ui_preferences p ON p.user_id=n.user_id AND p.notifications->>'push'='true'
         LEFT JOIN learner_profiles l ON l.user_id=n.user_id
         WHERE n.read_at IS NULL AND n.created_at>now()-interval '1 hour' AND ${eventEnabled}
           AND NOT EXISTS (SELECT 1 FROM notification_delivery_jobs j
             WHERE j.notification_id=n.id AND j.channel='push' AND j.subscription_id=s.id)
         ORDER BY n.created_at,n.id,s.id LIMIT 100 ON CONFLICT DO NOTHING`,
      );
    }
    if (channels.includes('email')) {
      await this.pool.query(
        `INSERT INTO notification_delivery_jobs(notification_id,channel,expires_at)
         SELECT n.id,'email',n.created_at+interval '6 hours'
         FROM user_notifications n
         JOIN users u ON u.id=n.user_id AND u.email_verified_at IS NOT NULL
         JOIN user_ui_preferences p ON p.user_id=n.user_id AND p.notifications->>'email'='true'
         LEFT JOIN learner_profiles l ON l.user_id=n.user_id
         WHERE n.read_at IS NULL AND n.created_at>now()-interval '1 hour'
           AND n.type IN ('daily','weekly') AND ${eventEnabled}
           AND NOT EXISTS (SELECT 1 FROM notification_delivery_jobs j
             WHERE j.notification_id=n.id AND j.channel='email')
         ORDER BY n.created_at,n.id LIMIT 100 ON CONFLICT DO NOTHING`,
      );
    }
  }

  async claim(channels: DeliveryChannel[]) {
    const {
      rows: [job],
    } = await this.pool.query<DeliveryJob>(
      `WITH due AS (
         SELECT id FROM notification_delivery_jobs
         WHERE channel=ANY($1::text[]) AND completed_at IS NULL AND available_at<=now()
           AND expires_at>now() AND attempts<6
         ORDER BY available_at,id LIMIT 1 FOR UPDATE SKIP LOCKED
       )
       UPDATE notification_delivery_jobs j
       SET attempts=j.attempts+1,available_at=now()+interval '60 seconds',lease_id=$2
       FROM due WHERE j.id=due.id
       RETURNING j.id, j.notification_id AS "notificationId",j.channel,j.attempts,
         j.lease_id AS "leaseId",j.expires_at AS "expiresAt"`,
      [channels, randomUUID()],
    );
    return job;
  }

  async target(job: DeliveryJob) {
    const {
      rows: [target],
    } = await this.pool.query<DeliveryTarget>(
      `SELECT n.user_id AS "userId", n.type, n.data, u.email, s.id AS "subscriptionId",
         s.endpoint,s.p256dh,s.auth_secret AS auth
       FROM notification_delivery_jobs j
       JOIN user_notifications n ON n.id=j.notification_id AND n.read_at IS NULL
       JOIN user_ui_preferences p ON p.user_id=n.user_id
       JOIN users u ON u.id=n.user_id
       LEFT JOIN learner_profiles l ON l.user_id=n.user_id
       LEFT JOIN notification_push_subscriptions s ON s.id=j.subscription_id AND s.user_id=n.user_id
       LEFT JOIN auth_sessions a ON a.id=s.session_id AND a.user_id=n.user_id AND a.expires_at>now()
       WHERE j.id=$1 AND j.lease_id=$2 AND j.expires_at>now() AND ${eventEnabled}
         AND ((j.channel='push' AND p.notifications->>'push'='true' AND a.id IS NOT NULL)
           OR (j.channel='email' AND p.notifications->>'email'='true'
             AND u.email_verified_at IS NOT NULL AND n.type IN ('daily','weekly')))`,
      [job.id, job.leaseId],
    );
    return target;
  }

  async complete(job: DeliveryJob, outcome: DeliveryOutcome) {
    await this.pool.query(
      `UPDATE notification_delivery_jobs SET completed_at=now(),outcome=$3,lease_id=null
       WHERE id=$1 AND lease_id=$2`,
      [job.id, job.leaseId, outcome],
    );
  }

  async defer(job: DeliveryJob, delaySeconds: number, countAttempt: boolean) {
    await this.pool.query(
      `UPDATE notification_delivery_jobs
       SET available_at=now()+$3*interval '1 second',lease_id=null,
         attempts=attempts-CASE WHEN $4::boolean THEN 0 ELSE 1 END
       WHERE id=$1 AND lease_id=$2`,
      [job.id, job.leaseId, delaySeconds, countAttempt],
    );
  }

  async cleanup() {
    await this.pool.query(
      `DELETE FROM notification_delivery_jobs WHERE id IN (
         SELECT id FROM notification_delivery_jobs WHERE expires_at<now()-interval '7 days'
         ORDER BY expires_at,id LIMIT 250 FOR UPDATE SKIP LOCKED
       )`,
    );
  }
}
