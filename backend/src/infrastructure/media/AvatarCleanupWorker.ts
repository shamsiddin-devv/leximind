import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AvatarCleanupQueue } from './AvatarCleanupQueue';
import { CloudinaryAvatarStorage } from './CloudinaryAvatarStorage';

@Injectable()
export class AvatarCleanupWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AvatarCleanupWorker.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  private stopping = false;

  constructor(
    private readonly queue: AvatarCleanupQueue,
    private readonly storage: CloudinaryAvatarStorage,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (
      this.config.get('NODE_ENV') === 'test' ||
      !this.storage.isConfigured()
    ) {
      return;
    }
    this.timer = setInterval(() => void this.flush(), 5000);
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
      for (let index = 0; index < 5 && !this.stopping; index++) {
        const job = await this.queue.claim();
        if (!job) return;
        try {
          await this.storage.remove(job.publicId);
        } catch {
          this.logger.warn('Avatar removal failed. The job will be retried.');
          await this.queue.retry(job);
          continue;
        }
        await this.queue.complete(job);
      }
    } catch {
      this.logger.error('Avatar cleanup queue processing failed.');
    }
  }
}
