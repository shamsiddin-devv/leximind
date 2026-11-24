import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountActionMailer } from './AccountActionMailer';
import { AccountActionRepository } from './AccountActionRepository';

@Injectable()
export class AccountEmailWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private active = false;
  private readonly logger = new Logger(AccountEmailWorker.name);
  constructor(
    private readonly mail: AccountActionMailer,
    private readonly actions: AccountActionRepository,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (!this.mail.isConfigured() || this.config.get('NODE_ENV') === 'test')
      return;
    this.timer = setInterval(() => void this.flush(), 5000);
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }
  async flush() {
    if (this.active) return;
    this.active = true;
    try {
      for (let index = 0; index < 5; index++) {
        const message = await this.actions.claimEmail();
        if (!message) break;
        if (
          await this.mail.send(
            message.email,
            message.kind,
            message.encryptedToken,
            message.digest,
          )
        ) {
          await this.actions.delivered(message.digest);
        }
      }
    } catch {
      this.logger.error('Account email queue processing failed.');
    } finally {
      this.active = false;
    }
  }
}
