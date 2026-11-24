import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sendNotification } from 'web-push';
import type {
  DeliveryChannel,
  DeliveryJob,
  DeliveryTarget,
} from './NotificationDeliveryRepository';
import {
  normalizePushSubscription,
  type PushCredentials,
} from './push-configuration';

type DeliveryResult =
  | { status: 'sent' | 'gone' | 'failed' }
  | { status: 'retry'; afterSeconds?: number };

const messages: Record<string, { title: string; body: string; path: string }> =
  {
    daily: {
      title: 'Kunlik mashq vaqti',
      body: 'Bugungi ingliz tili mashg‘ulotini boshlang.',
      path: '/dashboard',
    },
    review: {
      title: 'Takrorlash vaqti',
      body: 'Yodlagan so‘zlaringizni mustahkamlang.',
      path: '/review-center',
    },
    streak: {
      title: 'Faollik seriyangizni saqlang',
      body: 'Bugungi mashg‘ulot seriyangizni davom ettiradi.',
      path: '/dashboard',
    },
    achievements: {
      title: 'Yangi yutuq',
      body: 'LexiMind’da erishgan yutug‘ingizni ko‘ring.',
      path: '/achievements',
    },
    progress: {
      title: 'O‘quv natijangiz yangilandi',
      body: 'Statistika sahifasida natijalaringizni ko‘ring.',
      path: '/statistics',
    },
    weekly: {
      title: 'Haftalik o‘quv hisoboti',
      body: 'Ingliz tilini o‘rganish bo‘yicha haftalik natijalaringiz tayyor.',
      path: '/statistics',
    },
  };

function retryAfter(header?: string) {
  if (!header) return undefined;
  const seconds = /^\d+$/.test(header)
    ? Number(header)
    : Math.ceil((Date.parse(header) - Date.now()) / 1000);
  return Number.isFinite(seconds) ? Math.max(0, seconds) : undefined;
}

function failure(status: number, header?: string): DeliveryResult {
  if (status === 408 || status === 409 || status === 429 || status >= 500)
    return { status: 'retry', afterSeconds: retryAfter(header) };
  return { status: 'failed' };
}

@Injectable()
export class NotificationTransport {
  private readonly sendPush = sendNotification;

  constructor(private readonly config: ConfigService) {}

  capabilities() {
    return {
      pushPublicKey: this.vapid()?.publicKey ?? null,
      emailAvailable:
        this.enabled() &&
        Boolean(this.config.get<string>('EMAIL_API_KEY')?.trim()),
    };
  }

  channels(): DeliveryChannel[] {
    const { pushPublicKey, emailAvailable } = this.capabilities();
    const channels: DeliveryChannel[] = [];
    if (pushPublicKey) channels.push('push');
    if (emailAvailable) channels.push('email');
    return channels;
  }

  async deliver(
    job: DeliveryJob,
    target: DeliveryTarget,
  ): Promise<DeliveryResult> {
    const base = messages[target.type];
    const weekly = target.type === 'weekly' ? target.data : undefined;
    const message =
      base && weekly && Number.isInteger(weekly.count)
        ? {
            ...base,
            body: `O‘tgan hafta ${weekly.count} ta mashq, ${weekly.minutes ?? 0} daqiqa o‘qish va ${weekly.words ?? 0} ta yangi so‘z qayd etildi.`,
          }
        : base;
    if (!message) return { status: 'failed' };
    if (job.channel === 'push') return this.push(job, target, message);
    return this.email(job, target.email, message);
  }

  private enabled() {
    return this.config.get<boolean>('NOTIFICATION_DELIVERY_ENABLED', false);
  }

  private vapid(): PushCredentials | undefined {
    const subject = this.config.get<string>('VAPID_SUBJECT')?.trim();
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY')?.trim();
    if (this.enabled() && subject && publicKey && privateKey)
      return { subject, publicKey, privateKey };
  }

  private async push(
    job: DeliveryJob,
    target: DeliveryTarget,
    message: (typeof messages)[string],
  ): Promise<DeliveryResult> {
    const vapid = this.vapid();
    if (!vapid || !target.endpoint || !target.p256dh || !target.auth)
      return { status: 'failed' };
    let subscription;
    try {
      subscription = normalizePushSubscription({
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      });
    } catch {
      return { status: 'gone' };
    }
    try {
      const tag = job.notificationId.replaceAll('-', '');
      await this.sendPush(subscription, JSON.stringify({ ...message, tag }), {
        vapidDetails: vapid,
        timeout: 5000,
        TTL: Math.max(
          0,
          Math.min(
            900,
            Math.floor((job.expiresAt.getTime() - Date.now()) / 1000),
          ),
        ),
        urgency: 'normal',
        topic: tag,
      });
      return { status: 'sent' };
    } catch (error) {
      const status =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number(error.statusCode)
          : 0;
      if (status === 404 || status === 410) return { status: 'gone' };
      if (!status) return { status: 'retry' };
      const headers =
        error && typeof error === 'object' && 'headers' in error
          ? (error.headers as Record<string, string>)
          : undefined;
      return failure(status, headers?.['retry-after']);
    }
  }

  private async email(
    job: DeliveryJob,
    email: string,
    message: (typeof messages)[string],
  ): Promise<DeliveryResult> {
    if (!this.capabilities().emailAvailable) return { status: 'failed' };
    const base = this.config.getOrThrow<string>('ACCOUNT_ACTION_URL');
    const preferences = new URL('/settings/notifications', base);
    const details = new URL(message.path, base);
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization:
            'Bearer ' + this.config.getOrThrow<string>('EMAIL_API_KEY'),
          'Content-Type': 'application/json',
          'Idempotency-Key': 'leximind-notification/' + job.id,
        },
        body: JSON.stringify({
          from: this.config.getOrThrow<string>('EMAIL_FROM'),
          to: [email],
          subject: message.title,
          text:
            message.body +
            '\n\n' +
            details.href +
            '\n\nBildirishnoma sozlamalari: ' +
            preferences.href,
        }),
        signal: AbortSignal.timeout(5000),
      });
      await response.body?.cancel();
      return response.ok
        ? { status: 'sent' }
        : failure(
            response.status,
            response.headers.get('Retry-After') ?? undefined,
          );
    } catch {
      return { status: 'retry' };
    }
  }
}
