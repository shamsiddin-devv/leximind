import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LearningNotificationRepository } from './LearningNotificationRepository';

@Injectable()
export class LearningNotificationWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(LearningNotificationWorker.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  private stopping = false;

  constructor(
    private readonly repository: LearningNotificationRepository,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (this.config.get('NODE_ENV') === 'test') return;
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
      for (let index = 0; index < 20 && !this.stopping; index++) {
        const check = await this.repository.claim();
        if (!check) return;
        try {
          await this.repository.check(check);
        } catch {
          this.logger.warn(
            'Learning notification check failed and will be retried.',
          );
        }
      }
    } catch {
      this.logger.error('Learning notification schedule could not be read.');
    }
  }
}
