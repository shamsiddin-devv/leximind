import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitStorage } from '../auth/RateLimitStorage';
import {
  NotificationDeliveryRepository,
  type DeliveryChannel,
  type DeliveryJob,
} from './NotificationDeliveryRepository';
import { NotificationPushSubscriptions } from './NotificationPushSubscriptions';
import { NotificationTransport } from './NotificationTransport';

@Injectable()
export class NotificationDeliveryWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationDeliveryWorker.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  private nextScan = 0;
  private nextCleanup = 0;
  private stopping = false;

  constructor(
    private readonly queue: NotificationDeliveryRepository,
    private readonly subscriptions: NotificationPushSubscriptions,
    private readonly transport: NotificationTransport,
    private readonly limits: RateLimitStorage,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (
      this.config.get('NODE_ENV') === 'test' ||
      this.transport.channels().length === 0
    )
      return;
    this.timer = setInterval(() => void this.flush(), 2000);
    this.timer.unref();
  }

  async onModuleDestroy() {
    this.stopping = true;
    clearInterval(this.timer);
    await this.running;
  }

  flush() {
    this.running ??= this.process().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }

  private async process() {
    try {
      const channels = this.transport.channels();
      if (!channels.length) return;
      if (Date.now() >= this.nextScan) {
        await this.queue.enqueue(channels);
        this.nextScan = Date.now() + 15_000;
      }
      if (Date.now() >= this.nextCleanup) {
        await this.queue.cleanup();
        this.nextCleanup = Date.now() + 3600_000;
      }
      for (let index = 0; index < 5 && !this.stopping; index++) {
        const job = await this.queue.claim(channels);
        if (!job) return;
        await this.send(job);
      }
    } catch {
      this.logger.error('Notification delivery queue processing failed.');
    }
  }

  private async send(job: DeliveryJob) {
    const target = await this.queue.target(job);
    if (!target) {
      await this.queue.complete(job, 'skipped');
      return;
    }
    const wait = await this.rateLimit(job.channel, target.userId);
    if (wait > 0) {
      await this.queue.defer(job, wait, false);
      return;
    }
    const result = await this.transport.deliver(job, target);
    if (result.status === 'gone' && target.subscriptionId) {
      await this.subscriptions.remove(target.userId, target.subscriptionId);
      return;
    }
    if (result.status === 'retry' && job.attempts < 6) {
      const delay = Math.max(result.afterSeconds ?? 0, 15 * 2 ** job.attempts);
      if (Date.now() + delay * 1000 < job.expiresAt.getTime()) {
        await this.queue.defer(job, delay, true);
        return;
      }
    }
    const delivered = result.status === 'sent';
    if (!delivered)
      this.logger.warn('Notification delivery could not be completed.');
    await this.queue.complete(job, delivered ? 'delivered' : 'failed');
  }

  private async rateLimit(channel: DeliveryChannel, userId: string) {
    const key = 'notification-delivery:' + channel;
    const global = await this.limits.increment(
      key + ':global',
      1000,
      channel === 'email' ? 2 : 15,
      1000,
    );
    if (global.isBlocked) return Math.max(global.timeToBlockExpire, 1);
    const perUser = await this.limits.increment(
      key + ':' + userId,
      60_000,
      channel === 'email' ? 2 : 10,
      60_000,
    );
    return perUser.isBlocked ? Math.max(perUser.timeToBlockExpire, 1) : 0;
  }
}
